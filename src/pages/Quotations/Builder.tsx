import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuotationStore } from '../../store/quotationStore';
import { useCustomerStore } from '../../store/customerStore';
import { useCompanySettingsStore } from '../../store/companySettingsStore';
import { QuotationType, QuotationVersion, LabourQuotationItem, LabourScopeItem, FullSpecItem, MeasurementGroup, MeasurementItem, MeasurementDimension, MeasurementColumn, FreeformColumn, FreeformRow, PaymentScheduleLine } from '../../types';
import { Save, ArrowLeft, Download, Languages, Loader2 } from 'lucide-react';
import { translateTexts } from '../../utils/translateService';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { QuotationPDF } from '../../components/pdf/QuotationPDF';

const generateId = () => Math.random().toString(36).substring(2, 9);

const TYPE_A_NOTES = `Exclusions:
1. Curing of concrete/masonry is client's responsibility.
2. Temporary EB connection & water supply to be provided by client.
3. Accommodation for labour is not included.

Validity: This quotation is valid for 15 days.

Daily Rates for Extra Works:
- Mason: Rs. 900/day
- Helper: Rs. 600/day
- Centering Mason: Rs. 1000/day`;

const TYPE_B_NOTES = `Exclusions:
1. Plan approval and EB connection charges.
2. Any extra works not specified above.

Payment Terms: As per work progress (detailed schedule will be provided upon agreement).

Disclaimer: No hidden charges. All items executed exactly as per specifications.
Taxes: GST as applicable.
Validity: This quotation is valid for 30 days.`;

const TYPE_C_NOTES = `Payment Terms: Due within 7 days of bill submission.
Validity: Rates are valid for the duration of the current phase.`;

function parseDimension(val: string): number {
  if (!val) return 1;
  const match = val.match(/^(\d+)(?:'|-|\s)*(\d+)?(?:"|'')?$/);
  if (match) {
    const feet = parseInt(match[1]) || 0;
    const inches = parseInt(match[2]) || 0;
    return feet + (inches / 12);
  }
  const parsed = Number(val);
  return isNaN(parsed) ? 1 : parsed;
}

export function QuotationBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { createQuotation, updateVersion, fetchVersions, subscribeQuotations } = useQuotationStore();
  const { customers, subscribe: subscribeCustomers } = useCustomerStore();
  const { settings, fetchSettings, updateSettings } = useCompanySettingsStore();

  const [type, setType] = useState<QuotationType>('labour');
  const [subject, setSubject] = useState('');
  const [clientName, setClientName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [siteName, setSiteName] = useState('');
  const [notes, setNotes] = useState(TYPE_A_NOTES);
  const [showOwnerSignature, setShowOwnerSignature] = useState(false);
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  
  // Translation state
  const [language, setLanguage] = useState<'en' | 'ta'>('en');
  const [tamilData, setTamilData] = useState<NonNullable<QuotationVersion['tamilTranslations']>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationOutdated, setTranslationOutdated] = useState(false);

  const t = tamilData;
  const isTa = language === 'ta';

  const markOutdated = () => {
    if (Object.keys(tamilData).length > 0) setTranslationOutdated(true);
  };

  
  const [saving, setSaving] = useState(false);

  // When type changes, and notes is either empty or matches one of the defaults, update it
  useEffect(() => {
    setNotes(prev => {
      if (!prev || prev === TYPE_A_NOTES || prev === TYPE_B_NOTES || prev === TYPE_C_NOTES) {
        if (type === 'labour') return TYPE_A_NOTES;
        if (type === 'full_spec') return TYPE_B_NOTES;
        if (type === 'measurement') return TYPE_C_NOTES;
      }
      return prev;
    });
  }, [type]);

  // Labour (Type A)
  const [labourItems, setLabourItems] = useState<LabourQuotationItem[]>([
    { id: generateId(), floor: 'Ground Floor', ratePerSqft: 500 },
    { id: generateId(), floor: 'First Floor', ratePerSqft: 500 }
  ]);
  const [labourScope, setLabourScope] = useState<LabourScopeItem[]>([
    { id: generateId(), description: 'Earth work excavation for Column Foundation', measurement: '6\'-0"', order: 1 },
    { id: generateId(), description: 'PCC below column foundation', measurement: '', order: 2 },
    { id: generateId(), description: 'RCC column footing concrete as per standard specification.', measurement: '', order: 3 }
  ]);

  // Full Spec (Type B)
  const [fullSpecRate, setFullSpecRate] = useState<number>(2700);
  const [fullSpecItems, setFullSpecItems] = useState<FullSpecItem[]>([
    { id: generateId(), name: 'RCC COLUMN FOOTING', description: 'Reinforced Cement Concrete using 20mm broken granite stones as per standard architectural specification.', mixRatio: '1:1.5:3 mix', brandOptions: 'Ramco / Sankar', order: 1 },
    { id: generateId(), name: 'FLOORING TILES', description: 'Hi Gloss full body vitrified Tiles shall be used for all carpet areas.', brandOptions: 'Choice of design & brand as per the client', maxRateCap: 30, order: 2 }
  ]);

  // Measurement (Type C)
  const [measurementGroups, setMeasurementGroups] = useState<MeasurementGroup[]>([
    {
      id: generateId(),
      name: 'Ground Floor',
      order: 1,
      items: [
        {
          id: generateId(),
          description: 'Column Footing first step',
          order: 1,
          unitRate: 135,
          totalQuantity: 234.3, // (58.5 * 2) + (117.3 * 1)
          amount: 31630.5,
          dimensions: [
            { id: generateId(), description: 'F2', length: "6'-6\"", width: "6'-1\"", height: "1'-6\"", nos: 2, quantity: 58.5 },
            { id: generateId(), description: 'F5', length: "9'-8\"", width: "6'-1\"", height: "1'-3\"", nos: 1, quantity: 117.3 }
          ]
        }
      ]
    }
  ]);

  // User-defined extra columns for the measurement bill (Type C).
  const [measurementColumns, setMeasurementColumns] = useState<MeasurementColumn[]>([]);

  // Free-form / letter-pad (Type D). Seeded with a sensible starting table so
  // a new one isn't a blank slate.
  const [freeformTitle, setFreeformTitle] = useState('Statement of Specification');
  const [freeformColumns, setFreeformColumns] = useState<FreeformColumn[]>([
    { id: generateId(), name: 'Description', align: 'left' },
    { id: generateId(), name: 'Measurement', align: 'left' },
    { id: generateId(), name: 'Amount', align: 'right' },
  ]);
  const [freeformRows, setFreeformRows] = useState<FreeformRow[]>([{ id: generateId(), cells: {} }]);
  const [freeformSummary, setFreeformSummary] = useState('');
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleLine[]>([]);

  /** The version being edited. Needed to save back to the right document. */
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  useEffect(() => {
    fetchSettings();
    const unsubCustomers = subscribeCustomers();
    const unsubQuotations = subscribeQuotations();
    return () => {
      if (typeof unsubCustomers === 'function') unsubCustomers();
      if (typeof unsubQuotations === 'function') unsubQuotations();
    };
  }, [fetchSettings, subscribeCustomers, subscribeQuotations]);

  // Load an existing quotation into the form. Previously this did nothing, so
  // "Edit" opened a blank form and Save Draft silently discarded everything.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoadingExisting(true);

    (async () => {
      await fetchVersions(id);
      if (cancelled) return;

      const family = useQuotationStore.getState().quotations.find(q => q.id === id);
      const versions = useQuotationStore.getState().versions[id] || [];
      const v = versions.find(x => x.id === family?.currentVersionId) || versions[0];

      if (v) {
        setCurrentVersionId(v.id);
        setType(v.type || 'labour');
        setSubject(v.subject || '');
        setClientName(v.clientName || '');
        setContractorName(v.contractorName || '');
        setSiteName(v.siteName || '');
        setNotes(v.notes || '');
        setShowOwnerSignature(!!v.showOwnerSignature);
        setLanguage(v.language || 'en');
        setTamilData(v.tamilTranslations || {});
        if (v.labourItems) setLabourItems(v.labourItems);
        if (v.labourScope) setLabourScope(v.labourScope);
        if (v.fullSpecRate !== undefined) setFullSpecRate(v.fullSpecRate);
        if (v.fullSpecItems) setFullSpecItems(v.fullSpecItems);
        if (v.measurementGroups) setMeasurementGroups(v.measurementGroups);
        if (v.measurementColumns) setMeasurementColumns(v.measurementColumns);
        if (v.freeformTitle !== undefined) setFreeformTitle(v.freeformTitle);
        if (v.freeformColumns) setFreeformColumns(v.freeformColumns);
        if (v.freeformRows) setFreeformRows(v.freeformRows);
        if (v.freeformSummary !== undefined) setFreeformSummary(v.freeformSummary);
        if (v.paymentSchedule) setPaymentSchedule(v.paymentSchedule);
      }
      if (family?.customerId) setCustomerId(family.customerId);

      setLoadingExisting(false);
    })();

    return () => { cancelled = true; };
  }, [id, fetchVersions]);


  const handleTranslate = async () => {
    setIsTranslating(true);
    setTranslationOutdated(false);
    try {
      const texts: string[] = [];
      const map: any = { scope: [], specName: [], specDesc: [], groupName: [], itemDesc: [] };
      
      texts.push(subject || 'Quotation');
      texts.push(notes || '');
      
      if (type === 'labour') {
        labourScope.forEach(s => { texts.push(s.description || ''); map.scope.push(s.id); });
      } else if (type === 'full_spec') {
        fullSpecItems.forEach(s => { 
          texts.push(s.name || ''); map.specName.push(s.id);
          texts.push(s.description || ''); map.specDesc.push(s.id);
        });
      } else if (type === 'measurement') {
        measurementGroups.forEach(g => {
          texts.push(g.name || ''); map.groupName.push(g.id);
          g.items.forEach(i => { texts.push(i.description || ''); map.itemDesc.push(i.id); });
        });
      }

      const res = await translateTexts(texts, 'ta');
      if (res.setupRequired) {
         alert('Translation API is not configured yet. Please set GOOGLE_TRANSLATE_API_KEY in Vercel.');
         return;
      }
      if (res.error || !res.translations) throw new Error(res.error);

      let idx = 0;
      const tr = res.translations;
      const newTa: any = {
        subject: tr[idx++],
        notes: tr[idx++],
        labourScope: {},
        fullSpecItems: {},
        measurementGroups: {}
      };

      if (type === 'labour') {
        map.scope.forEach((id: string) => newTa.labourScope[id] = tr[idx++]);
      } else if (type === 'full_spec') {
        map.specName.forEach((id: string) => {
          newTa.fullSpecItems[id] = { name: tr[idx++], description: tr[idx++] };
        });
      } else if (type === 'measurement') {
        map.groupName.forEach((id: string, gIdx: number) => {
          newTa.measurementGroups[id] = { name: tr[idx++], items: {} };
          measurementGroups[gIdx].items.forEach((i: any) => {
             newTa.measurementGroups[id].items[i.id] = tr[idx++];
          });
        });
      }

      setTamilData(newTa);
      setLanguage('ta');
    } catch (err: any) {
      alert('Translation failed: ' + err.message);
      setTranslationOutdated(true);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!settings) throw new Error("Company settings not loaded");
      
      const payload: any = {
        customerId: customerId || undefined,
        type,
        subject,
        clientName,
        contractorName,
        siteName,
        notes,
        companySnapshot: settings,
        language,
        tamilTranslations: tamilData,
        showOwnerSignature,
      };

      if (type === 'labour') {
        payload.labourItems = labourItems;
        payload.labourScope = labourScope;
      } else if (type === 'full_spec') {
        payload.fullSpecRate = fullSpecRate;
        payload.fullSpecItems = fullSpecItems;
      } else if (type === 'measurement') {
        payload.measurementGroups = measurementGroups;
        payload.measurementColumns = measurementColumns;
      } else if (type === 'freeform') {
        payload.freeformTitle = freeformTitle;
        payload.freeformColumns = freeformColumns;
        payload.freeformRows = freeformRows;
        payload.freeformSummary = freeformSummary;
        payload.paymentSchedule = paymentSchedule;
      }

      if (id) {
        if (!currentVersionId) throw new Error('Still loading this quotation — try again in a moment.');
        await updateVersion(currentVersionId, { ...payload, familyId: id });
      } else {
        await createQuotation(payload);
      }
      navigate('/quotations');
    } catch (error: any) {
      console.error(error);
      alert('Failed to save quotation: ' + (error?.message || error));
    } finally {
      setSaving(false);
    }
  };

  /**
   * The preview was regenerating without pause because previewData was rebuilt
   * on every render AND carried a fresh Date.now() each time, so react-pdf saw
   * a brand new document on every keystroke - and even between keystrokes.
   *
   * Two fixes: the date is fixed once for the life of the screen, and the
   * object is memoised on the fields that actually appear in the document.
   */
  const previewDate = useMemo(() => Date.now(), []);

  const previewData = useMemo(() => ({
    type,
    subject,
    clientName,
    contractorName,
    siteName,
    notes,
    companySnapshot: settings || {},
    language,
    tamilTranslations: tamilData,
    date: previewDate,
    createdAt: previewDate,
    labourItems,
    labourScope,
    fullSpecRate,
    fullSpecItems,
    measurementGroups,
    measurementColumns,
    freeformTitle,
    freeformColumns,
    freeformRows,
    freeformSummary,
    paymentSchedule,
    showOwnerSignature,
  } as QuotationVersion), [
    type, subject, clientName, contractorName, siteName, notes, settings,
    language, tamilData, previewDate, labourItems, labourScope,
    fullSpecRate, fullSpecItems, measurementGroups, measurementColumns,
    freeformTitle, freeformColumns, freeformRows, freeformSummary, paymentSchedule, showOwnerSignature,
  ]);

  /**
   * Rebuilding a PDF on every keystroke is both visually jarring and slow, so
   * the preview follows a short pause in typing rather than each character.
   */
  const [debouncedPreview, setDebouncedPreview] = useState(previewData);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedPreview(previewData), 600);
    return () => clearTimeout(t);
  }, [previewData]);

  // Measurement Helpers
  const recalcMeasurementItem = (item: MeasurementItem): MeasurementItem => {
    const totalQty = item.dimensions.reduce((sum, dim) => sum + ((Number(dim.quantity) || 0) * (Number(dim.nos) || 1)), 0);
    const amount = totalQty * (item.unitRate || 0);
    return { ...item, totalQuantity: parseFloat(totalQty.toFixed(2)), amount: parseFloat(amount.toFixed(2)) };
  };

  const updateMeasurementGroup = (groupId: string, updater: (g: MeasurementGroup) => MeasurementGroup) => {
    setMeasurementGroups(groups => groups.map(g => g.id === groupId ? updater(g) : g));
  };

  const updateMeasurementItem = (groupId: string, itemId: string, updater: (i: MeasurementItem) => MeasurementItem) => {
    updateMeasurementGroup(groupId, g => ({
      ...g,
      items: g.items.map(i => i.id === itemId ? recalcMeasurementItem(updater(i)) : i)
    }));
  };

  const handleDimensionChange = (groupId: string, itemId: string, dimId: string, field: keyof MeasurementDimension, value: string | number) => {
    updateMeasurementItem(groupId, itemId, i => {
      const newDims = i.dimensions.map(d => {
        if (d.id !== dimId) return d;
        const newDim = { ...d, [field]: value };
        if (['length', 'width', 'height'].includes(field as string)) {
          const l = newDim.length ? parseDimension(newDim.length) : 1;
          const w = newDim.width ? parseDimension(newDim.width) : 1;
          const h = newDim.height ? parseDimension(newDim.height) : 1;
          if (newDim.length || newDim.width || newDim.height) {
             newDim.quantity = Number((l * w * h).toFixed(2));
          }
        }
        return newDim;
      });
      return { ...i, dimensions: newDims };
    });
  };


  const handleInputChange = (field: 'subject' | 'notes', val: string) => {
    if (isTa) {
      setTamilData(prev => ({ ...prev, [field]: val }));
    } else {
      if (field === 'subject') setSubject(val);
      if (field === 'notes') setNotes(val);
      markOutdated();
    }
  };

  return (
    <div className="space-y-6">
      {/* Title on its own row so the buttons below have room to wrap on a phone.
          On a phone the row that follows collapses everything to icons + a wide
          Save, which stays reachable without horizontal scrolling. */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/quotations')} className="text-gray-500 hover:text-gray-700 shrink-0">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
          {id ? 'Edit Quotation' : 'New Quotation'}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex bg-gray-100 rounded-md p-1">
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 text-sm font-medium rounded ${language === 'en' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('ta')}
            className={`px-3 py-1 text-sm font-medium rounded flex items-center ${language === 'ta' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            TA
            {translationOutdated && <span className="ml-1 w-2 h-2 rounded-full bg-orange-500" title="Translation may be outdated" />}
          </button>
        </div>

        <button
          onClick={handleTranslate}
          disabled={isTranslating}
          className="bg-purple-50 text-purple-700 border border-purple-200 px-3 py-2 rounded-md hover:bg-purple-100 flex items-center disabled:opacity-50"
          title="Auto-translate to Tamil"
        >
          {isTranslating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Languages className="w-5 h-5" />}
        </button>

        {settings && (
          <PDFDownloadLink
            document={<QuotationPDF quotation={previewData} />}
            fileName={`Quotation-${previewData.type}-${Date.now()}.pdf`}
            className="bg-gray-100 text-gray-700 px-3 sm:px-4 py-2 rounded-md hover:bg-gray-200 flex items-center border border-gray-300 text-sm"
          >
            {/* @ts-ignore */}
            {({ loading }) => (
              <>
                <Download className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">
                  {loading ? 'Preparing PDF...' : 'Download PDF'}
                </span>
              </>
            )}
          </PDFDownloadLink>
        )}

        {/* Save is the primary action; it stretches to fill the row on a phone
            so a rushed thumb always lands on it. */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center disabled:opacity-50 min-w-[8rem] sm:min-w-0"
        >
          <Save className="w-5 h-5 mr-2" /> {saving ? 'Saving...' : 'Save Draft'}
        </button>
      </div>

      <div className="lg:hidden flex border-b border-gray-200 mb-4">
        <button 
          className={`flex-1 py-2 text-sm font-medium border-b-2 ${mobileView === 'editor' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
          onClick={() => setMobileView('editor')}
        >
          Editor
        </button>
        <button 
          className={`flex-1 py-2 text-sm font-medium border-b-2 ${mobileView === 'preview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
          onClick={() => setMobileView('preview')}
        >
          Live Preview
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`space-y-6 lg:block ${mobileView === 'editor' ? 'block' : 'hidden'} max-h-[calc(100vh-120px)] overflow-y-auto pr-2 pb-8`}>
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 space-y-6">
            <h2 className="text-lg font-medium border-b pb-2">General Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Quotation Type</label>
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value as QuotationType)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  disabled={!!id}
                >
                  <option value="labour">Type A: Labour Quotation</option>
                  <option value="full_spec">Type B: Full Specification</option>
                  <option value="measurement">Type C: Measurement Bill</option>
                  <option value="freeform">Type D: Letter-pad (free-form)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <input 
                  type="text" 
                  value={isTa ? (t.subject || '') : subject}
                  onChange={e => handleInputChange('subject', e.target.value)}
                  placeholder={isTa ? subject : 'e.g. Residential Construction Quote'}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Client</label>
                {/* Linking to a real customer is what makes this quotation show
                    up on that customer's page. Typing a name alone never did. */}
                <select
                  value={customerId}
                  onChange={e => {
                    const cid = e.target.value;
                    setCustomerId(cid);
                    const c = customers.find(x => x.id === cid);
                    if (c) setClientName(c.name);
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="">-- Not linked to a customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Name as it should appear on the quotation"
                />
                {!customerId && (
                  <p className="mt-1 text-xs text-amber-700">
                    Not linked to a customer — this quotation won't appear on any customer's page.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Project / Site Name</label>
                <input 
                  type="text" 
                  value={siteName}
                  onChange={e => setSiteName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Contractor Name (Optional, used in Type B)</label>
                <input 
                  type="text" 
                  value={contractorName}
                  onChange={e => setContractorName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                  placeholder="e.g. S. Manikanda Prabhu"
                />
              </div>
              <div className="md:col-span-2 mt-4 flex items-center">
                <input 
                  type="checkbox" 
                  id="showOwnerSignature"
                  checked={showOwnerSignature}
                  onChange={e => setShowOwnerSignature(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="showOwnerSignature" className="ml-2 block text-sm text-gray-900">
                  Append Digital Signature to PDF
                </label>
              </div>
            </div>
          </div>

          {type === 'labour' && (
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200 space-y-6">
              <div className="border-b pb-2 flex justify-between items-center">
                <h2 className="text-lg font-medium">Labour Rates (Per Floor)</h2>
                <button 
                  onClick={() => setLabourItems([...labourItems, { id: generateId(), floor: '', ratePerSqft: 0 }])}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  + Add Floor
                </button>
              </div>
              <div className="space-y-4">
                {labourItems.map((item, index) => (
                  <div key={item.id} className="flex space-x-4 items-center">
                    <input 
                      type="text" 
                      placeholder="e.g. Ground Floor" 
                      value={item.floor}
                      onChange={e => {
                        const newItems = [...labourItems];
                        newItems[index].floor = e.target.value;
                        setLabourItems(newItems);
                      }}
                      className="flex-1 border border-gray-300 rounded-md p-2" 
                    />
                    <input 
                      type="number" 
                      placeholder="Rate (₹)" 
                      value={item.ratePerSqft}
                      onChange={e => {
                        const newItems = [...labourItems];
                        newItems[index].ratePerSqft = Number(e.target.value);
                        setLabourItems(newItems);
                      }}
                      className="w-24 sm:w-32 border border-gray-300 rounded-md p-2" 
                    />
                    <button 
                      onClick={() => setLabourItems(labourItems.filter(i => i.id !== item.id))}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="border-b pb-2 flex justify-between items-center mt-6">
                <h2 className="text-lg font-medium">Scope of Work</h2>
                <button 
                  onClick={() => setLabourScope([...labourScope, { id: generateId(), description: '', measurement: '', order: labourScope.length + 1 }])}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  + Add Item
                </button>
              </div>
              <div className="space-y-3">
                {labourScope.map((scope, index) => (
                  <div key={scope.id} className="flex space-x-3 items-start">
                    <span className="text-gray-500 font-medium mt-2">{index + 1}.</span>
                    <div className="flex-1 space-y-2">
                      <input 
                        type="text" 
                        value={isTa ? (t.labourScope?.[scope.id] || '') : scope.description}
                        placeholder={isTa ? scope.description : "Description..."}
                        onChange={e => {
                          if (isTa) {
                            setTamilData(prev => ({ ...prev, labourScope: { ...prev.labourScope, [scope.id]: e.target.value } }));
                          } else {
                            const newScope = [...labourScope];
                            newScope[index].description = e.target.value;
                            setLabourScope(newScope);
                            markOutdated();
                          }
                        }}
                        className="w-full border border-gray-300 rounded-md p-2" 
                      />
                      <input 
                        type="text" 
                        value={scope.measurement || ''}
                        placeholder="Inline measurement (optional) e.g. 6'-0&quot;"
                        onChange={e => {
                          const newScope = [...labourScope];
                          newScope[index].measurement = e.target.value;
                          setLabourScope(newScope);
                        }}
                        className="w-full border border-gray-300 rounded-md p-2 text-sm text-gray-600 bg-gray-50" 
                      />
                    </div>
                    <button 
                      onClick={() => setLabourScope(labourScope.filter(s => s.id !== scope.id))}
                      className="text-red-500 hover:text-red-700 mt-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === 'full_spec' && (
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200 space-y-6">
              <div className="border-b pb-2 flex justify-between items-center">
                <h2 className="text-lg font-medium">Pricing</h2>
              </div>
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-gray-700">All-inclusive Rate (per sq.ft)</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input 
                    type="number" 
                    value={fullSpecRate}
                    onChange={e => setFullSpecRate(Number(e.target.value))}
                    className="pl-7 block w-full border border-gray-300 rounded-md p-2" 
                  />
                </div>
              </div>
              
              <div className="border-b pb-2 flex justify-between items-center mt-6">
                <h2 className="text-lg font-medium">Specifications List</h2>
                <button 
                  onClick={() => setFullSpecItems([...fullSpecItems, { id: generateId(), name: '', description: '', order: fullSpecItems.length + 1 }])}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  + Add Specification
                </button>
              </div>
              
              <div className="space-y-4">
                {fullSpecItems.map((spec, index) => (
                  <div key={spec.id} className="border border-gray-200 rounded-md p-4 space-y-3 bg-gray-50 relative">
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2 flex-1 mr-4">
                        <span className="font-semibold text-gray-700 mt-2">{index + 1}.</span>
                        <input 
                          type="text" 
                          value={isTa ? (t.fullSpecItems?.[spec.id]?.name || '') : spec.name}
                          onChange={e => {
                            if (isTa) {
                               setTamilData(prev => ({ ...prev, fullSpecItems: { ...prev.fullSpecItems, [spec.id]: { ...prev.fullSpecItems?.[spec.id], name: e.target.value } } }));
                            } else {
                               const newSpecs = [...fullSpecItems];
                               newSpecs[index].name = e.target.value;
                               setFullSpecItems(newSpecs);
                               markOutdated();
                            }
                          }}
                          placeholder="Specification Name (e.g. RCC FOOTING)"
                          className="font-semibold text-gray-700 w-full border border-gray-300 rounded-md p-2 text-sm"
                        />
                      </div>
                      <button 
                        onClick={() => setFullSpecItems(fullSpecItems.filter(s => s.id !== spec.id))}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500">Description</label>
                        <input 
                          type="text" 
                          value={isTa ? (t.fullSpecItems?.[spec.id]?.description || '') : spec.description}
                          onChange={e => {
                            if (isTa) {
                               setTamilData(prev => ({ ...prev, fullSpecItems: { ...prev.fullSpecItems, [spec.id]: { ...prev.fullSpecItems?.[spec.id], description: e.target.value } } }));
                            } else {
                               const newSpecs = [...fullSpecItems];
                               newSpecs[index].description = e.target.value;
                               setFullSpecItems(newSpecs);
                               markOutdated();
                            }
                          }}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Mix Ratio / Grade (Optional)</label>
                        <input 
                          type="text" 
                          value={spec.mixRatio || ''}
                          onChange={e => {
                            const newSpecs = [...fullSpecItems];
                            newSpecs[index].mixRatio = e.target.value;
                            setFullSpecItems(newSpecs);
                          }}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Brand Options (Optional)</label>
                        <input 
                          type="text" 
                          value={spec.brandOptions || ''}
                          onChange={e => {
                            const newSpecs = [...fullSpecItems];
                            newSpecs[index].brandOptions = e.target.value;
                            setFullSpecItems(newSpecs);
                          }}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Max Rate Cap ₹ (Optional)</label>
                        <input 
                          type="number" 
                          value={spec.maxRateCap || ''}
                          onChange={e => {
                            const newSpecs = [...fullSpecItems];
                            newSpecs[index].maxRateCap = e.target.value ? Number(e.target.value) : undefined;
                            setFullSpecItems(newSpecs);
                          }}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm" 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === 'measurement' && (
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200 space-y-6">
              <div className="border-b pb-2 flex justify-between items-center">
                <h2 className="text-lg font-medium">Measurement Bill Details</h2>
                <button
                  onClick={() => setMeasurementGroups([...measurementGroups, { id: generateId(), name: 'New Group', order: measurementGroups.length + 1, items: [] }])}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  + Add Group (Floor/Phase)
                </button>
              </div>

              {/* Custom columns manager. Extra reference columns (e.g. "Depth",
                  "Ref") appear on every dimension row after L/W/H/Nos. They are
                  free text and don't feed the quantity calc. Names can be saved
                  to reuse on the next quotation. */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Extra columns</span>
                  <button
                    type="button"
                    onClick={() => {
                      const name = window.prompt('Name of the new column (e.g. Depth, Ref no.)');
                      if (!name || !name.trim()) return;
                      const col = { id: generateId(), name: name.trim() };
                      setMeasurementColumns(cols => [...cols, col]);
                      // Remember it for reuse across quotations.
                      const saved = settings?.savedMeasurementColumns || [];
                      if (!saved.includes(col.name) && settings) {
                        updateSettings({ ...settings, savedMeasurementColumns: [...saved, col.name] }).catch(() => {});
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add column
                  </button>
                </div>

                {measurementColumns.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {measurementColumns.map(col => (
                      <span key={col.id} className="inline-flex items-center gap-1 bg-white border border-gray-300 rounded-full pl-3 pr-1 py-1 text-xs">
                        {col.name}
                        <button
                          type="button"
                          onClick={() => setMeasurementColumns(cols => cols.filter(c => c.id !== col.id))}
                          className="text-gray-400 hover:text-red-600 rounded-full w-4 h-4 flex items-center justify-center"
                          title="Remove this column from the quotation"
                        >✕</button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mb-2">No extra columns. The bill shows Desc/Tag, L, W, H/D, Nos, Qty.</p>
                )}

                {/* Quick re-add from the saved library. */}
                {(settings?.savedMeasurementColumns || []).filter(n => !measurementColumns.some(c => c.name === n)).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-gray-400">Saved:</span>
                    {(settings?.savedMeasurementColumns || [])
                      .filter(n => !measurementColumns.some(c => c.name === n))
                      .map(name => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setMeasurementColumns(cols => [...cols, { id: generateId(), name }])}
                          className="text-xs bg-white border border-blue-200 text-blue-700 rounded-full px-2 py-0.5 hover:bg-blue-100"
                        >+ {name}</button>
                      ))}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {measurementGroups.map((group) => (
                  <div key={group.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                      <input 
                        type="text" 
                        value={isTa ? (t.measurementGroups?.[group.id]?.name || '') : group.name}
                        placeholder={isTa ? group.name : ''}
                        onChange={e => {
                          if (isTa) {
                            setTamilData(prev => ({ ...prev, measurementGroups: { ...prev.measurementGroups, [group.id]: { ...prev.measurementGroups?.[group.id], name: e.target.value } } }));
                          } else {
                            updateMeasurementGroup(group.id, g => ({ ...g, name: e.target.value }));
                            markOutdated();
                          }
                        }}
                        className="font-semibold text-gray-700 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none px-1 w-1/2" 
                      />
                      <div className="flex items-center space-x-4">
                        <button 
                          onClick={() => updateMeasurementGroup(group.id, g => ({ ...g, items: [...g.items, { id: generateId(), description: 'New Item', dimensions: [], totalQuantity: 0, unitRate: 0, amount: 0, order: g.items.length + 1 }] }))}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          + Add Line Item
                        </button>
                        <button onClick={() => setMeasurementGroups(measurementGroups.filter(g => g.id !== group.id))} className="text-red-500 hover:text-red-700">✕</button>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {group.items.map(item => (
                        <div key={item.id} className="bg-white border border-gray-200 rounded p-4 space-y-3 shadow-sm">
                          {/* Item name on its own row - it used to share a squeezed
                              flex row with the Unit Rate field and the two collided
                              on narrow screens. Now the name spans the full width and
                              the rate sits on its own labelled line below. */}
                          <div className="flex items-start gap-2">
                            <input
                              type="text"
                              value={isTa ? (t.measurementGroups?.[group.id]?.items?.[item.id] || '') : item.description}
                              placeholder={isTa ? item.description : 'Item name (e.g. Column Footing)'}
                              onChange={e => {
                                if (isTa) {
                                   setTamilData(prev => ({ ...prev, measurementGroups: { ...prev.measurementGroups, [group.id]: { ...prev.measurementGroups?.[group.id], items: { ...prev.measurementGroups?.[group.id]?.items, [item.id]: e.target.value } } } }));
                                } else {
                                   updateMeasurementItem(group.id, item.id, i => ({ ...i, description: e.target.value }));
                                   markOutdated();
                                }
                              }}
                              className="flex-1 min-w-0 font-medium text-gray-800 border border-gray-300 rounded focus:border-blue-500 focus:outline-none px-2 py-1.5"
                            />
                            <button
                              onClick={() => updateMeasurementGroup(group.id, g => ({ ...g, items: g.items.filter(i => i.id !== item.id) }))}
                              className="text-red-400 hover:text-red-600 shrink-0 p-1.5"
                              title="Remove this item"
                            >✕</button>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500 shrink-0">Unit Rate (₹)</label>
                            <input
                              type="number"
                              value={item.unitRate}
                              onChange={e => updateMeasurementItem(group.id, item.id, i => ({ ...i, unitRate: Number(e.target.value) }))}
                              className="w-28 border border-gray-300 rounded p-1.5 text-sm"
                            />
                          </div>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                <tr>
                                  <th className="px-1 py-1">Desc/Tag</th>
                                  <th className="px-1 py-1">L</th>
                                  <th className="px-1 py-1">W</th>
                                  <th className="px-1 py-1">H/D</th>
                                  <th className="px-1 py-1">Nos</th>
                                  <th className="px-1 py-1">Qty (Unit)</th>
                                  {measurementColumns.map(col => (
                                    <th key={col.id} className="px-1 py-1 whitespace-nowrap">{col.name}</th>
                                  ))}
                                  <th className="px-1 py-1"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.dimensions.map(dim => (
                                  <tr key={dim.id}>
                                    <td className="px-1 py-1">
                                      <input type="text" value={dim.description} onChange={e => handleDimensionChange(group.id, item.id, dim.id, 'description', e.target.value)} className="w-full border border-gray-300 rounded p-1 text-xs" />
                                    </td>
                                    <td className="px-1 py-1">
                                      <input type="text" value={dim.length} onChange={e => handleDimensionChange(group.id, item.id, dim.id, 'length', e.target.value)} className="w-14 border border-gray-300 rounded p-1 text-xs" />
                                    </td>
                                    <td className="px-1 py-1">
                                      <input type="text" value={dim.width} onChange={e => handleDimensionChange(group.id, item.id, dim.id, 'width', e.target.value)} className="w-14 border border-gray-300 rounded p-1 text-xs" />
                                    </td>
                                    <td className="px-1 py-1">
                                      <input type="text" value={dim.height} onChange={e => handleDimensionChange(group.id, item.id, dim.id, 'height', e.target.value)} className="w-14 border border-gray-300 rounded p-1 text-xs" />
                                    </td>
                                    <td className="px-1 py-1">
                                      <input type="number" value={dim.nos} onChange={e => handleDimensionChange(group.id, item.id, dim.id, 'nos', Number(e.target.value))} className="w-12 border border-gray-300 rounded p-1 text-xs font-medium" />
                                    </td>
                                    <td className="px-1 py-1">
                                      <input type="number" value={dim.quantity} onChange={e => handleDimensionChange(group.id, item.id, dim.id, 'quantity', Number(e.target.value))} className="w-16 border border-gray-300 rounded p-1 text-xs font-medium bg-blue-50" title="Base Volume/Area" />
                                    </td>
                                    {measurementColumns.map(col => (
                                      <td key={col.id} className="px-1 py-1">
                                        <input
                                          type="text"
                                          value={dim.customValues?.[col.id] || ''}
                                          onChange={e => updateMeasurementItem(group.id, item.id, i => ({
                                            ...i,
                                            dimensions: i.dimensions.map(d => d.id === dim.id
                                              ? { ...d, customValues: { ...(d.customValues || {}), [col.id]: e.target.value } }
                                              : d),
                                          }))}
                                          className="w-16 border border-gray-300 rounded p-1 text-xs"
                                        />
                                      </td>
                                    ))}
                                    <td className="px-1 py-1 text-red-500 cursor-pointer text-center" onClick={() => updateMeasurementItem(group.id, item.id, i => ({ ...i, dimensions: i.dimensions.filter(d => d.id !== dim.id) }))}>
                                      ✕
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <button 
                            onClick={() => updateMeasurementItem(group.id, item.id, i => ({ ...i, dimensions: [...i.dimensions, { id: generateId(), description: '', length: '', width: '', height: '', nos: 1, quantity: 0 }] }))}
                            className="text-xs text-blue-600 mt-1"
                          >
                            + Add Dimension Row
                          </button>
                          
                          <div className="flex justify-end pt-2 border-t mt-2">
                            <div className="text-sm">
                              <span className="text-gray-500 mr-4">Total Qty: <span className="font-bold text-gray-800">{item.totalQuantity}</span></span>
                              <span className="text-gray-500">Amount: <span className="font-bold text-gray-800">₹ {item.amount?.toLocaleString('en-IN') || 0}</span></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === 'freeform' && (
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200 space-y-5">
              <h2 className="text-lg font-medium border-b pb-2">Letter-pad (free-form) quotation</h2>
              <p className="text-xs text-gray-500 -mt-2">
                Build the quotation exactly as you would write it by hand. Name the columns, fill the
                rows, and add a payment schedule underneath.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heading above the table</label>
                <input
                  type="text"
                  value={freeformTitle}
                  onChange={e => setFreeformTitle(e.target.value)}
                  placeholder="e.g. Statement of Specification"
                  className="block w-full border border-gray-300 rounded p-2 text-sm"
                />
              </div>

              {/* Columns manager */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Columns</span>
                  <button
                    type="button"
                    onClick={() => setFreeformColumns(c => [...c, { id: generateId(), name: 'New column', align: 'left' }])}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >+ Add column</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {freeformColumns.map(col => (
                    <div key={col.id} className="flex items-center gap-1 bg-white border border-gray-300 rounded px-2 py-1">
                      <input
                        type="text"
                        value={col.name}
                        onChange={e => setFreeformColumns(cs => cs.map(c => c.id === col.id ? { ...c, name: e.target.value } : c))}
                        className="text-xs border-b border-transparent focus:border-blue-400 focus:outline-none w-28"
                      />
                      <button
                        type="button"
                        onClick={() => setFreeformColumns(cs => cs.map(c => c.id === col.id ? { ...c, align: c.align === 'right' ? 'left' : 'right' } : c))}
                        title="Toggle left / right alignment"
                        className="text-[10px] text-gray-500 border border-gray-200 rounded px-1"
                      >{col.align === 'right' ? 'R' : 'L'}</button>
                      <button
                        type="button"
                        onClick={() => setFreeformColumns(cs => cs.filter(c => c.id !== col.id))}
                        className="text-gray-400 hover:text-red-600 text-xs"
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                      {freeformColumns.map(col => (
                        <th key={col.id} className="px-1 py-1 text-left font-medium">{col.name}</th>
                      ))}
                      <th className="px-1 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {freeformRows.map(row => (
                      <tr key={row.id}>
                        {freeformColumns.map(col => (
                          <td key={col.id} className="px-1 py-1">
                            <input
                              type="text"
                              value={row.cells?.[col.id] || ''}
                              onChange={e => setFreeformRows(rs => rs.map(r => r.id === row.id ? { ...r, cells: { ...r.cells, [col.id]: e.target.value } } : r))}
                              className="w-full min-w-[90px] border border-gray-300 rounded p-1 text-xs"
                            />
                          </td>
                        ))}
                        <td className="px-1 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => setFreeformRows(rs => rs.filter(r => r.id !== row.id))}
                            className="text-red-400 hover:text-red-600 text-xs"
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => setFreeformRows(rs => [...rs, { id: generateId(), cells: {} }])}
                className="text-xs text-blue-600 hover:text-blue-800"
              >+ Add row</button>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summary line (optional)</label>
                <input
                  type="text"
                  value={freeformSummary}
                  onChange={e => setFreeformSummary(e.target.value)}
                  placeholder="e.g. Quotation Value : 550/- x 3,783.625 sft = 20,95,500"
                  className="block w-full border border-gray-300 rounded p-2 text-sm"
                />
              </div>

              {/* Payment schedule */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">Payment schedule</h3>
                  <button
                    type="button"
                    onClick={() => setPaymentSchedule(p => [...p, { id: generateId(), description: '', percentage: 0, amount: 0 }])}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >+ Add line</button>
                </div>
                {paymentSchedule.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                        <tr>
                          <th className="px-1 py-1 text-left">Description of Work</th>
                          <th className="px-1 py-1 w-16">%</th>
                          <th className="px-1 py-1 w-28">Amount</th>
                          <th className="px-1 py-1"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentSchedule.map(line => (
                          <tr key={line.id}>
                            <td className="px-1 py-1">
                              <input type="text" value={line.description} onChange={e => setPaymentSchedule(p => p.map(l => l.id === line.id ? { ...l, description: e.target.value } : l))} className="w-full border border-gray-300 rounded p-1 text-xs" />
                            </td>
                            <td className="px-1 py-1">
                              <input type="number" value={line.percentage || ''} onChange={e => setPaymentSchedule(p => p.map(l => l.id === line.id ? { ...l, percentage: Number(e.target.value) } : l))} className="w-14 border border-gray-300 rounded p-1 text-xs" />
                            </td>
                            <td className="px-1 py-1">
                              <input type="number" value={line.amount || ''} onChange={e => setPaymentSchedule(p => p.map(l => l.id === line.id ? { ...l, amount: Number(e.target.value) } : l))} className="w-24 border border-gray-300 rounded p-1 text-xs" />
                            </td>
                            <td className="px-1 py-1 text-center">
                              <button type="button" onClick={() => setPaymentSchedule(p => p.filter(l => l.id !== line.id))} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold text-gray-700">
                          <td className="px-1 py-1 text-right">Total</td>
                          <td className="px-1 py-1">{paymentSchedule.reduce((s, l) => s + (Number(l.percentage) || 0), 0)}%</td>
                          <td className="px-1 py-1">₹{paymentSchedule.reduce((s, l) => s + (Number(l.amount) || 0), 0).toLocaleString('en-IN')}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">The percentages should add up to 100%.</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-medium border-b pb-2 mb-4">Notes & Terms</h2>
            <textarea
              value={isTa ? (t.notes || '') : notes}
              onChange={e => handleInputChange('notes', e.target.value)}
              placeholder={isTa ? notes : 'General notes or exclusions...'}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm font-mono"
              rows={8}
            />
          </div>
        </div>

        {/* Right Side: Live PDF Preview.
            Only rendered on tablet+; on phones Chrome refuses to render PDFs
            inside an iframe (a browser limitation, not a bug in the app), so
            the panel was showing the browser's fallback - a raw UUID and an
            "Open" button - instead of anything useful. Below lg we surface a
            plain "Download PDF" prompt instead, and hide the mobile Preview
            tab entirely so the toggle isn't there to be pressed. */}
        <div className={`hidden lg:block h-[calc(100vh-120px)] lg:sticky lg:top-6`}>
          <div className="bg-gray-100 rounded-lg border border-gray-200 h-full overflow-hidden shadow-inner flex flex-col">
            <div className="p-3 bg-gray-800 text-white text-sm font-medium flex justify-between items-center">
              <span>Live A4 Preview</span>
              <span className="text-xs text-gray-400">Updates as you type</span>
            </div>
            {settings ? (
              <PDFViewer width="100%" height="100%" className="border-0 bg-gray-50 flex-1">
                <QuotationPDF quotation={debouncedPreview} />
              </PDFViewer>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Loading preview...
              </div>
            )}
          </div>
        </div>

        {mobileView === 'preview' && (
          <div className="lg:hidden bg-gray-50 rounded-lg border border-dashed border-gray-300 p-6 text-center space-y-3">
            <Download className="w-8 h-8 mx-auto text-gray-400" />
            <p className="text-sm font-medium text-gray-900">Preview isn't shown on phones</p>
            <p className="text-sm text-gray-600 max-w-xs mx-auto">
              Chrome on Android won't display a PDF inside the page. Use <b>Download PDF</b> above
              to see the finished quotation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
