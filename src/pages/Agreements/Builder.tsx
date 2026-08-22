import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAgreementStore } from '../../store/agreementStore';
import { useQuotationStore } from '../../store/quotationStore';
import { useProjectStore } from '../../store/projectStore';
import { useCustomerStore } from '../../store/customerStore';
import { AgreementVersion } from '../../types';
import { ArrowLeft, Save, Plus, Trash2, GripVertical, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { AgreementPDF } from '../../components/pdf/AgreementPDF';
import {
  calculateMilestoneAmount,
  calculateMilestonePercentage,
  validatePaymentSchedule,
  formatINR,
} from '../../utils/currencyMath';

type SetupStep = 'confirm-value' | 'payment-schedule' | 'review';

export function AgreementBuilder() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const quotationId = searchParams.get('quotationId');

  const navigate = useNavigate();
  const {
    createAgreementFromQuotation,
    versions: aggVersions,
    fetchVersions: fetchAggVersions,
    updateVersion,
  } = useAgreementStore();
  const { versions: quoVersions, fetchVersions: fetchQuoVersions } = useQuotationStore();
  const { projects } = useProjectStore();
  const { customers } = useCustomerStore();

  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(!!quotationId);
  const [setupStep, setSetupStep] = useState<SetupStep>('confirm-value');

  // Setup wizard state
  const [confirmedContractValue, setConfirmedContractValue] = useState<number>(0);
  const [quotationValue, setQuotationValue] = useState<number>(0);
  const [scheduleItems, setScheduleItems] = useState<AgreementVersion['paymentSchedule']>([]);

  // Editor state
  const [activeVersion, setActiveVersion] = useState<AgreementVersion | null>(null);

  // Load quotation data for setup
  useEffect(() => {
    if (quotationId) {
      if (!quoVersions[quotationId]) fetchQuoVersions(quotationId);
    }
  }, [quotationId, quoVersions, fetchQuoVersions]);

  // Load quotation reference value (DO NOT auto-fill confirmed contract value)
  useEffect(() => {
    if (quotationId && quoVersions[quotationId]) {
      const latestQ = quoVersions[quotationId][0];
      if (latestQ) {
        // Calculate from quotation items only if it's a measurement quotation with exact amounts
        let qVal = 0;
        if (latestQ.type === 'measurement' && latestQ.measurementGroups) {
          qVal = latestQ.measurementGroups.reduce(
            (acc, g) => acc + g.items.reduce((sum, i) => sum + i.amount, 0),
            0
          );
        }
        // Note: For 'labour' quotations, it's strictly rates-based, so no total is calculated.
        setQuotationValue(qVal);
        // We explicitly DO NOT setConfirmedContractValue(qVal) anymore.
      }
    }
  }, [quotationId, quoVersions]);

  // Load existing agreement for edit mode
  useEffect(() => {
    if (id) {
      if (!aggVersions[id]) {
        fetchAggVersions(id);
      } else {
        setActiveVersion(aggVersions[id][0]);
      }
    }
  }, [id, aggVersions, fetchAggVersions]);

  // ===================== SETUP WIZARD HELPERS =====================

  const addScheduleItem = () => {
    setScheduleItems([
      ...scheduleItems,
      {
        id: crypto.randomUUID(),
        description: '',
        percentage: 0,
        amount: 0,
      },
    ]);
  };

  const updateScheduleItem = (idx: number, field: string, value: any) => {
    const updated = [...scheduleItems];
    if (field === 'percentage') {
      const perc = Number(value);
      updated[idx] = {
        ...updated[idx],
        percentage: perc,
        amount: calculateMilestoneAmount(confirmedContractValue, perc),
      };
    } else if (field === 'amount') {
      const amt = Number(value);
      updated[idx] = {
        ...updated[idx],
        amount: amt,
        percentage: calculateMilestonePercentage(confirmedContractValue, amt),
      };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setScheduleItems(updated);
  };

  const removeScheduleItem = (idx: number) => {
    setScheduleItems(scheduleItems.filter((_, i) => i !== idx));
  };

  const moveScheduleItem = (from: number, direction: 'up' | 'down') => {
    const to = direction === 'up' ? from - 1 : from + 1;
    if (to < 0 || to >= scheduleItems.length) return;
    const updated = [...scheduleItems];
    [updated[from], updated[to]] = [updated[to], updated[from]];
    setScheduleItems(updated);
  };

  const scheduleValidation = useMemo(
    () => validatePaymentSchedule(confirmedContractValue, scheduleItems),
    [confirmedContractValue, scheduleItems]
  );

  // ===================== GENERATE AGREEMENT =====================

  const handleGenerate = async () => {
    if (!quotationId) return;
    const qVersions = quoVersions[quotationId];
    if (!qVersions || qVersions.length === 0) return alert('Quotation data not loaded yet.');

    const latestQ = qVersions[0];
    if (confirmedContractValue <= 0) return alert('Please enter a valid contract value.');

    setLoading(true);
    try {
      const newAggId = await createAgreementFromQuotation(
        quotationId,
        latestQ,
        confirmedContractValue,
        scheduleItems,
        quotationValue
      );
      navigate(`/agreements/${newAggId}/edit`, { replace: true });
      setSetupMode(false);
    } catch (e: any) {
      alert('Failed to generate agreement: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ===================== EDIT MODE HELPERS =====================

  const handleSave = async () => {
    if (!activeVersion || !id) return;
    setLoading(true);
    try {
      await updateVersion(activeVersion.id, {
        totalValue: activeVersion.totalValue,
        termsAndConditions: activeVersion.termsAndConditions,
        scopeOfWork: activeVersion.scopeOfWork,
        paymentSchedule: activeVersion.paymentSchedule,
        signatures: activeVersion.signatures,
        showOwnerSignature: activeVersion.showOwnerSignature,
        language: activeVersion.language,
        tamilTranslations: activeVersion.tamilTranslations,
      });
      alert('Saved successfully');
    } catch (e: any) {
      alert('Failed to save agreement: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const editScheduleItem = (idx: number, field: string, value: any) => {
    if (!activeVersion) return;
    const newSched = [...activeVersion.paymentSchedule];
    if (field === 'percentage') {
      const perc = Number(value);
      newSched[idx] = {
        ...newSched[idx],
        percentage: perc,
        amount: calculateMilestoneAmount(activeVersion.totalValue, perc),
      };
    } else if (field === 'amount') {
      const amt = Number(value);
      newSched[idx] = {
        ...newSched[idx],
        amount: amt,
        percentage: calculateMilestonePercentage(activeVersion.totalValue, amt),
      };
    } else {
      newSched[idx] = { ...newSched[idx], [field]: value };
    }
    setActiveVersion({ ...activeVersion, paymentSchedule: newSched });
  };

  const editValidation = useMemo(
    () =>
      activeVersion
        ? validatePaymentSchedule(activeVersion.totalValue, activeVersion.paymentSchedule)
        : null,
    [activeVersion]
  );

  // ===================== SETUP WIZARD RENDER =====================

  if (setupMode) {
    const qVersions = quoVersions[quotationId!];
    const latestQ = qVersions?.[0];

    // Find customer info
    const customer = latestQ ? customers.find((c) => c.name === latestQ.clientName) : null;

    return (
      <div className="max-w-3xl mx-auto mt-4 sm:mt-10 space-y-6 pb-20 px-2 sm:px-0">
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => navigate('/agreements')}
            className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Agreement Setup
          </h1>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center space-x-2 text-sm mb-6 overflow-x-auto">
          {(['confirm-value', 'payment-schedule', 'review'] as SetupStep[]).map(
            (step, idx) => (
              <div key={step} className="flex items-center whitespace-nowrap">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    setupStep === step
                      ? 'bg-blue-600 text-white'
                      : idx <
                        ['confirm-value', 'payment-schedule', 'review'].indexOf(
                          setupStep
                        )
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {idx + 1}
                </div>
                <span
                  className={`ml-2 hidden sm:inline ${
                    setupStep === step ? 'text-blue-700 font-medium' : 'text-gray-500'
                  }`}
                >
                  {step === 'confirm-value'
                    ? 'Contract Value'
                    : step === 'payment-schedule'
                    ? 'Payment Schedule'
                    : 'Review & Generate'}
                </span>
                {idx < 2 && (
                  <div className="w-8 h-px bg-gray-300 mx-2" />
                )}
              </div>
            )
          )}
        </div>

        {/* Step 1: Confirm Contract Value */}
        {setupStep === 'confirm-value' && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-6">
            <h2 className="text-lg font-semibold">Step 1: Confirm Contract Value</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-gray-500 block">Quotation</span>
                <span className="font-medium">
                  {latestQ?.quotationNumber || 'Loading...'}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-gray-500 block">Client</span>
                <span className="font-medium">
                  {latestQ?.clientName || customer?.name || 'N/A'}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-gray-500 block">Site</span>
                <span className="font-medium">{latestQ?.siteName || 'N/A'}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-gray-500 block">Quotation Value</span>
                <span className="font-medium text-gray-700">
                  {latestQ?.type === 'labour' 
                    ? <span className="text-xs">Rates Based (No fixed total)</span>
                    : quotationValue > 0 ? formatINR(quotationValue) : 'N/A'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Final Contract Value (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={confirmedContractValue || ''}
                onChange={(e) => setConfirmedContractValue(Number(e.target.value))}
                className="block w-full border border-gray-300 rounded-md shadow-sm p-3 text-lg font-bold bg-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter final negotiated contract value"
              />
              {confirmedContractValue > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  = {formatINR(confirmedContractValue)}
                </p>
              )}
              {latestQ?.type === 'labour' && (
                <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                  💡 Since this is a Labour Quotation based on rates, please calculate the total amount based on the total built-up area and enter it here.
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (confirmedContractValue <= 0)
                    return alert('Please enter a valid contract value.');
                  setSetupStep('payment-schedule');
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Payment Schedule Builder */}
        {setupStep === 'payment-schedule' && (
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Step 2: Payment Schedule</h2>
              <div className="text-sm font-medium text-gray-600">
                Contract: {formatINR(confirmedContractValue)}
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Define the payment milestones for this contract. Add stages, set
              percentages or amounts — the other field auto-calculates.
            </p>

            {/* Schedule Items */}
            <div className="space-y-3">
              {scheduleItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-xs text-gray-400 font-mono w-6">
                      {idx + 1}.
                    </span>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveScheduleItem(idx, 'up')}
                        disabled={idx === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Move up"
                      >
                        <GripVertical className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateScheduleItem(idx, 'description', e.target.value)
                    }
                    className="flex-1 min-w-0 border border-gray-300 rounded p-2 text-sm"
                    placeholder="Stage description (e.g. Advance, Foundation)"
                  />

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        value={item.percentage || ''}
                        onChange={(e) =>
                          updateScheduleItem(idx, 'percentage', e.target.value)
                        }
                        className="w-20 border border-gray-300 rounded p-2 text-sm pr-6"
                        placeholder="%"
                      />
                      <span className="absolute right-2 top-2 text-gray-400 text-sm">
                        %
                      </span>
                    </div>

                    <div className="w-28 sm:w-32 bg-white border border-gray-200 rounded p-2 text-sm font-medium text-right">
                      {item.amount > 0
                        ? formatINR(item.amount)
                        : '₹0'}
                    </div>

                    <button
                      onClick={() => removeScheduleItem(idx)}
                      className="text-red-400 hover:text-red-600 p-1"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addScheduleItem}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Stage
            </button>

            {/* Validation Bar */}
            <div
              className={`p-4 rounded-lg border ${
                scheduleItems.length === 0
                  ? 'bg-gray-50 border-gray-200'
                  : scheduleValidation.isValid
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 block">Contract Value</span>
                  <span className="font-bold">
                    {formatINR(confirmedContractValue)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Scheduled Total</span>
                  <span className="font-bold">
                    {formatINR(scheduleValidation.totalAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Total %</span>
                  <span className="font-bold">
                    {scheduleValidation.totalPercentage.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Difference</span>
                  <span
                    className={`font-bold ${
                      scheduleValidation.isValid
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatINR(Math.abs(scheduleValidation.difference))}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center text-sm">
                {scheduleItems.length === 0 ? (
                  <span className="text-gray-500">
                    Add payment milestones above.
                  </span>
                ) : scheduleValidation.isValid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-green-700 font-medium">VALID</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-600 mr-1" />
                    <span className="text-red-700">{scheduleValidation.message}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setSetupStep('confirm-value')}
                className="text-gray-600 hover:text-gray-800 px-4 py-2"
              >
                ← Back
              </button>
              <button
                onClick={() => setSetupStep('review')}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Generate */}
        {setupStep === 'review' && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-6">
            <h2 className="text-lg font-semibold">Step 3: Review & Generate</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <span className="text-blue-600 block text-xs uppercase font-medium">
                  Confirmed Contract Value
                </span>
                <span className="text-2xl font-bold text-blue-800">
                  {formatINR(confirmedContractValue)}
                </span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <span className="text-gray-500 block text-xs uppercase font-medium">
                  Payment Stages
                </span>
                <span className="text-2xl font-bold text-gray-800">
                  {scheduleItems.length}
                </span>
              </div>
            </div>

            {!scheduleValidation.isValid && scheduleItems.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                <strong>Warning:</strong> {scheduleValidation.message} You can still
                generate a draft agreement, but it should be corrected before
                finalizing.
              </div>
            )}

            {/* Schedule summary table */}
            {scheduleItems.length > 0 && (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500">
                      #
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500">
                      Description
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-right font-medium text-gray-500">
                      %
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-right font-medium text-gray-500">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {scheduleItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2 font-medium">
                        {item.description || '(No description)'}
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-right">
                        {item.percentage.toFixed(1)}%
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-right font-medium">
                        {formatINR(item.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-4 py-2" colSpan={2}>
                      Total
                    </td>
                    <td className="px-2 sm:px-4 py-2 text-right">
                      {scheduleValidation.totalPercentage.toFixed(1)}%
                    </td>
                    <td className="px-2 sm:px-4 py-2 text-right">
                      {formatINR(scheduleValidation.totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setSetupStep('payment-schedule')}
                className="text-gray-600 hover:text-gray-800 px-4 py-2"
              >
                ← Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Generating...' : 'Generate Agreement'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===================== EDIT MODE =====================

  if (aggVersions[id!] && !activeVersion) {
    return (
      <div className="p-8 text-red-600">Error: Agreement version not found.</div>
    );
  }

  if (!activeVersion)
    return <div className="p-8">Loading agreement...</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/agreements')}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Edit Agreement
          </h1>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50"
          >
            <Save className="w-5 h-5 mr-2" /> {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Agreement Details Card */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-medium border-b pb-2 mb-4">
              Agreement Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500">Subject</label>
                <div className="font-medium">{activeVersion.subject}</div>
              </div>
              <div>
                <label className="block text-xs text-gray-500">Contract Value</label>
                <div className="font-bold text-green-600">
                  {formatINR(activeVersion.totalValue)}
                </div>
                {activeVersion.contractValueDiffersFromQuotation &&
                  activeVersion.quotationValue && (
                    <div className="text-xs text-amber-600 mt-1">
                      Quotation was {formatINR(activeVersion.quotationValue)}
                    </div>
                  )}
              </div>
              <div>
                <label className="block text-xs text-gray-500">Client</label>
                <div>{activeVersion.clientName}</div>
              </div>
              <div>
                <label className="block text-xs text-gray-500">Site</label>
                <div>{activeVersion.siteName}</div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center">
              <input
                type="checkbox"
                id="showOwnerSignature"
                checked={activeVersion.showOwnerSignature || false}
                onChange={(e) =>
                  setActiveVersion({
                    ...activeVersion,
                    showOwnerSignature: e.target.checked,
                  })
                }
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label
                htmlFor="showOwnerSignature"
                className="ml-2 block text-sm text-gray-900"
              >
                Append Digital Signature to PDF
              </label>
            </div>
          </div>

          {/* Payment Schedule Card */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 border border-gray-200">
            <h2 className="text-lg font-medium border-b pb-2 mb-4">
              Payment Schedule
            </h2>
            <div className="space-y-3">
              {activeVersion.paymentSchedule.map((milestone, idx) => (
                <div
                  key={milestone.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2"
                >
                  <span className="text-xs text-gray-400 font-mono w-6 shrink-0">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={milestone.description}
                    onChange={(e) =>
                      editScheduleItem(idx, 'description', e.target.value)
                    }
                    className="flex-1 min-w-0 border border-gray-300 rounded p-2 text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        value={milestone.percentage || ''}
                        onChange={(e) =>
                          editScheduleItem(idx, 'percentage', e.target.value)
                        }
                        className="w-20 border border-gray-300 rounded p-2 text-sm pr-6"
                      />
                      <span className="absolute right-2 top-2 text-gray-400 text-sm">
                        %
                      </span>
                    </div>
                    <div className="w-28 sm:w-32 bg-gray-50 border border-gray-200 rounded p-2 text-sm font-medium text-right">
                      {formatINR(milestone.amount)}
                    </div>
                    <button
                      onClick={() => {
                        const newSched = activeVersion.paymentSchedule.filter(
                          (m) => m.id !== milestone.id
                        );
                        setActiveVersion({
                          ...activeVersion,
                          paymentSchedule: newSched,
                        });
                      }}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  const newSched = [
                    ...activeVersion.paymentSchedule,
                    {
                      id: crypto.randomUUID(),
                      description: '',
                      percentage: 0,
                      amount: 0,
                    },
                  ];
                  setActiveVersion({
                    ...activeVersion,
                    paymentSchedule: newSched,
                  });
                }}
                className="text-sm text-blue-600 mt-2 flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Milestone
              </button>
            </div>

            {/* Validation Bar */}
            {editValidation && (
              <div
                className={`mt-4 p-3 rounded-lg border text-sm ${
                  activeVersion.paymentSchedule.length === 0
                    ? 'bg-gray-50 border-gray-200 text-gray-500'
                    : editValidation.isValid
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>Total: {editValidation.totalPercentage.toFixed(1)}%</span>
                  <span>{formatINR(editValidation.totalAmount)}</span>
                  {!editValidation.isValid && (
                    <span className="font-medium">
                      Diff: {formatINR(Math.abs(editValidation.difference))}
                    </span>
                  )}
                </div>
                {activeVersion.paymentSchedule.length > 0 && (
                  <div className="mt-1 flex items-center">
                    {editValidation.isValid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        VALID
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        {editValidation.message}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-medium border-b pb-2 mb-4">
              Terms & Conditions
            </h2>
            <textarea
              value={activeVersion.termsAndConditions}
              onChange={(e) =>
                setActiveVersion({
                  ...activeVersion,
                  termsAndConditions: e.target.value,
                })
              }
              className="w-full border border-gray-300 rounded p-3 text-sm h-48 font-mono"
            />
          </div>

          {/* Scope of Work */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-medium border-b pb-2 mb-4">
              Scope of Work (Compiled)
            </h2>
            <textarea
              value={activeVersion.scopeOfWork}
              onChange={(e) =>
                setActiveVersion({
                  ...activeVersion,
                  scopeOfWork: e.target.value,
                })
              }
              className="w-full border border-gray-300 rounded p-3 text-sm h-48 font-mono bg-gray-50"
            />
          </div>
        </div>

        {/* PDF Preview Sidebar */}
        <div className="h-[calc(100vh-120px)] lg:sticky lg:top-6">
          <div className="bg-gray-100 rounded-lg border border-gray-200 h-full overflow-hidden shadow-inner flex flex-col items-center justify-center text-gray-500">
            <div className="w-full bg-gray-800 text-white text-sm font-medium flex justify-between items-center p-3">
              <span>Agreement Preview</span>
              <PDFDownloadLink
                document={<AgreementPDF agreement={activeVersion} />}
                fileName={`Agreement-${activeVersion.agreementNumber}.pdf`}
                className="text-blue-400 hover:text-blue-300"
              >
                {/* @ts-ignore */}
                {({ loading: pdfLoading }) =>
                  pdfLoading ? 'Preparing...' : 'Download PDF'
                }
              </PDFDownloadLink>
            </div>
            <PDFViewer
              width="100%"
              height="100%"
              className="border-0 bg-gray-50 flex-1"
            >
              <AgreementPDF agreement={activeVersion} />
            </PDFViewer>
          </div>
        </div>
      </div>
    </div>
  );
}
