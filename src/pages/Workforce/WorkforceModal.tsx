import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useWorkforceStore } from '../../store/workforceStore';
import { storage } from '../../lib/firebase';
import { WorkforceType, Workforce } from '../../types';
import { Loader2, Upload, ExternalLink, X } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  onClose: () => void;
  /** When provided the modal edits this person instead of creating a new one. */
  workerToEdit?: Workforce | null;
}

const ID_PROOF_TYPES: NonNullable<Workforce['idProofType']>[] = ['Aadhaar', 'PAN', 'Voter ID', 'Driving Licence', 'Other'];

export function WorkforceModal({ onClose, workerToEdit }: Props) {
  const { createWorkforce, updateWorkforce, loading } = useWorkforceStore();
  const isEdit = !!workerToEdit;

  const [name, setName] = useState(workerToEdit?.name || '');
  const [phone, setPhone] = useState(workerToEdit?.phone || '');
  const [address, setAddress] = useState(workerToEdit?.address || '');
  const [type, setType] = useState<WorkforceType>(workerToEdit?.type || 'Coolie');
  const [trade, setTrade] = useState(workerToEdit?.trade || '');
  const [monthlySalary, setMonthlySalary] = useState<number | ''>(workerToEdit?.monthlySalary ?? '');
  const [dailyWage, setDailyWage] = useState<number | ''>(workerToEdit?.dailyWage ?? '');
  const [notes, setNotes] = useState(workerToEdit?.notes || '');
  const [isActive, setIsActive] = useState(workerToEdit?.isActive ?? true);
  const [joinedOn, setJoinedOn] = useState(
    workerToEdit?.joinedOn ? format(workerToEdit.joinedOn, 'yyyy-MM-dd') : ''
  );

  const [idProofType, setIdProofType] = useState<Workforce['idProofType'] | ''>(workerToEdit?.idProofType || '');
  const [idProofNumber, setIdProofNumber] = useState(workerToEdit?.idProofNumber || '');
  const [idProofUrl, setIdProofUrl] = useState(workerToEdit?.idProofUrl || '');
  const [idFile, setIdFile] = useState<File | null>(null);

  const [bankAccountName, setBankAccountName] = useState(workerToEdit?.bankAccountName || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(workerToEdit?.bankAccountNumber || '');
  const [bankIfsc, setBankIfsc] = useState(workerToEdit?.bankIfsc || '');
  const [upiId, setUpiId] = useState(workerToEdit?.upiId || '');

  const [uploading, setUploading] = useState(false);

  const paidDaily = type === 'Coolie' || type === 'Site Staff';
  const paidMonthly = type === 'Permanent Employee' || type === 'Site Staff';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !trade) return alert('Name, phone, and trade are required');

    try {
      setUploading(true);

      // Upload the ID photo first, so a failed upload doesn't leave a record
      // pointing at a file that isn't there.
      let finalIdUrl = idProofUrl;
      if (idFile) {
        const safeName = idFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storageRef = ref(storage, `workforce/${workerToEdit?.id || name.replace(/\s+/g, '_')}/id_${Date.now()}_${safeName}`);
        await uploadBytes(storageRef, idFile);
        finalIdUrl = await getDownloadURL(storageRef);
      }

      const payload: any = {
        name,
        phone,
        address,
        type,
        trade,
        isActive,
        notes,
        monthlySalary: paidMonthly && monthlySalary ? Number(monthlySalary) : undefined,
        dailyWage: paidDaily && dailyWage ? Number(dailyWage) : undefined,
        idProofType: idProofType || undefined,
        idProofNumber: idProofNumber || undefined,
        idProofUrl: finalIdUrl || undefined,
        bankAccountName: bankAccountName || undefined,
        bankAccountNumber: bankAccountNumber || undefined,
        bankIfsc: bankIfsc || undefined,
        upiId: upiId || undefined,
        joinedOn: joinedOn ? new Date(joinedOn).getTime() : undefined,
      };

      // Firestore rejects undefined outright; strip rather than send.
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      if (isEdit && workerToEdit) {
        await updateWorkforce(workerToEdit.id, payload);
      } else {
        await createWorkforce(payload);
      }
      onClose();
    } catch (error: any) {
      console.error(error);
      alert(`Failed to ${isEdit ? 'save changes' : 'add workforce member'}: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const label = 'block text-sm font-medium text-gray-700';
  const field = 'mt-1 block w-full border border-gray-300 rounded p-2';
  const busy = loading || uploading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-lg w-full p-4 sm:p-6 mt-10 mb-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{isEdit ? `Edit ${workerToEdit!.name}` : 'Add Staff / Contractor'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={label}>Full Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className={field} placeholder="e.g. Ramesh" />
          </div>
          <div>
            <label className={label}>Phone Number</label>
            <input type="text" required value={phone} onChange={e => setPhone(e.target.value)} className={field} />
          </div>
          <div>
            <label className={label}>Type</label>
            <select value={type} onChange={e => setType(e.target.value as WorkforceType)} className={field}>
              <option value="Coolie">Coolie</option>
              <option value="Site Staff">Site Staff</option>
              <option value="Permanent Employee">Permanent Employee</option>
              <option value="Contractor">Contractor</option>
              <option value="Subcontractor">Subcontractor</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              <strong>Coolie</strong> — paid per day worked. <strong>Site Staff</strong> — regular site person on a monthly salary, e.g. a supervisor.
            </p>
          </div>
          <div>
            <label className={label}>Trade / Skill</label>
            <input type="text" required value={trade} onChange={e => setTrade(e.target.value)} className={field} placeholder="e.g. Mason, Electrician, Supervisor" />
          </div>
          <div>
            <label className={label}>Address (Optional)</label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} className={field} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Joined On (Optional)</label>
              <input type="date" value={joinedOn} onChange={e => setJoinedOn(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>Status</label>
              <select value={isActive ? 'active' : 'inactive'} onChange={e => setIsActive(e.target.value === 'active')} className={field}>
                <option value="active">Currently working</option>
                <option value="inactive">No longer working</option>
              </select>
            </div>
          </div>

          {paidMonthly && (
            <div>
              <label className={label}>Monthly Salary (₹) (Optional)</label>
              <input type="number" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value ? Number(e.target.value) : '')} className={field} placeholder="Current monthly salary" />
            </div>
          )}

          {paidDaily && (
            <div>
              <label className={label}>Usual Daily Wage (₹) (Optional)</label>
              <input type="number" value={dailyWage} onChange={e => setDailyWage(e.target.value ? Number(e.target.value) : '')} className={field} placeholder="e.g. 1200" />
              <p className="mt-1 text-xs text-gray-500">
                Used to pre-fill each day's amount. The actual amount can be changed per day when marking attendance.
              </p>
            </div>
          )}

          {/* ---- Identity ---- */}
          <fieldset className="border border-gray-200 rounded-md p-3">
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">ID Proof</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600">Type</label>
                <select value={idProofType} onChange={e => setIdProofType(e.target.value as any)} className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm">
                  <option value="">-- None --</option>
                  {ID_PROOF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Number</label>
                <input value={idProofNumber} onChange={e => setIdProofNumber(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm" />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Photo of document (Optional)</label>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  {idFile ? 'Change file' : 'Choose file'}
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setIdFile(e.target.files?.[0] || null)} />
                </label>
                {idFile && <span className="text-xs text-gray-600 truncate max-w-[160px]">{idFile.name}</span>}
                {!idFile && idProofUrl && (
                  <a href={idProofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <ExternalLink className="w-3 h-3" /> View uploaded
                  </a>
                )}
              </div>
            </div>
          </fieldset>

          {/* ---- Payment details ---- */}
          <fieldset className="border border-gray-200 rounded-md p-3">
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Bank / UPI</legend>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600">UPI ID</label>
                <input value={upiId} onChange={e => setUpiId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm" placeholder="name@bank" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Account Holder</label>
                  <input value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">IFSC</label>
                  <input value={bankIfsc} onChange={e => setBankIfsc(e.target.value.toUpperCase())} className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Account Number</label>
                <input value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm" />
              </div>
            </div>
          </fieldset>

          <div>
            <label className={label}>Notes (Optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className={field} rows={2} />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={busy} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? (uploading && idFile ? 'Uploading…' : 'Saving…') : isEdit ? 'Save Changes' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
