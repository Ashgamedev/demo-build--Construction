import { useState, useEffect } from 'react';
import { useIdeaStore } from '../../store/ideaStore';
import { Plus, Image as ImageIcon, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { currentActor } from '../../lib/audit';

interface Props {
  projectId: string;
}

export function PlansIdeasTab({ projectId }: Props) {
  const { ideas, subscribeIdeas, addIdea, updateIdeaStatus, removeIdea } = useIdeaStore();
  
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'Floor Plan' | 'Elevation' | 'Interior' | 'Exterior' | 'Reference' | 'Other'>('Floor Plan');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsub = subscribeIdeas(projectId);
    return () => unsub();
  }, [projectId, subscribeIdeas]);

  const projectIdeas = ideas[projectId] || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert('Title is required');
    
    setUploading(true);
    try {
      await addIdea(projectId, {
        projectId,
        title,
        description,
        category,
        status: 'Pending',
        createdBy: currentActor().id
      }, imageFile || undefined);
      
      setIsAdding(false);
      setTitle('');
      setDescription('');
      setCategory('Floor Plan');
      setImageFile(null);
      setPreviewUrl(null);
    } catch (error: any) {
      alert('Failed to add idea: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow border border-gray-200">
        <div>
          <h3 className="font-semibold text-gray-900">Plans & Ideas Workspace</h3>
          <p className="text-sm text-gray-500">Upload and approve floor plans, 3D elevations, and interior design references.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-1" /> Add New
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAddSubmit} className="bg-white p-6 rounded-lg shadow border border-blue-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input 
                type="text" required
                value={title} onChange={e => setTitle(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm"
                placeholder="e.g. Living Room False Ceiling Option 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select 
                value={category} onChange={e => setCategory(e.target.value as any)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm"
              >
                <option value="Floor Plan">Floor Plan</option>
                <option value="Elevation">3D Elevation</option>
                <option value="Interior">Interior Design</option>
                <option value="Exterior">Exterior Design</option>
                <option value="Reference">Reference Image</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Description / Notes</label>
            <textarea 
              value={description} onChange={e => setDescription(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload File (Optional)</label>
            <div className="flex items-center space-x-4">
              <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-2">
                  <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500">Upload File</p>
                </div>
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>
              {previewUrl && (
                <div className="relative w-32 h-32 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex flex-col items-center justify-center text-center p-2">
                  {imageFile?.type.startsWith('image/') ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
                  ) : (
                    <span className="text-xs text-gray-600 break-all truncate w-full">{imageFile?.name}</span>
                  )}
                  <button type="button" onClick={() => {setImageFile(null); setPreviewUrl(null);}} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 z-10">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setIsAdding(false)} className="text-gray-600 hover:text-gray-800 px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={uploading} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
              {uploading ? 'Saving...' : 'Save to Workspace'}
            </button>
          </div>
        </form>
      )}

      {projectIdeas.length === 0 && !isAdding ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center text-gray-500">
          <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p>No plans or ideas added yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectIdeas.map(idea => (
            <div key={idea.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              {idea.imageUrl ? (
                <div className="h-48 w-full bg-gray-100 relative group flex items-center justify-center border-b border-gray-200 p-4">
                  {idea.imageUrl.toLowerCase().includes('.pdf') ? (
                    <div className="text-center">
                      <div className="bg-red-100 text-red-600 p-4 rounded-full inline-block mb-2">
                        <span className="font-bold">PDF</span>
                      </div>
                      <p className="text-sm font-medium text-gray-600">Document File</p>
                    </div>
                  ) : (
                    <img src={idea.imageUrl} alt={idea.title} className="w-full h-full object-cover absolute inset-0" />
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
                    <a href={idea.imageUrl} target="_blank" rel="noopener noreferrer" className="bg-white text-gray-900 px-3 py-1.5 rounded text-sm font-medium shadow-sm hover:bg-gray-50">View File</a>
                  </div>
                </div>
              ) : (
                <div className="h-48 w-full bg-gray-100 flex items-center justify-center border-b border-gray-200">
                  <ImageIcon className="w-12 h-12 text-gray-300" />
                </div>
              )}
              
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {idea.category}
                  </span>
                  <div className="flex items-center space-x-1">
                    {idea.status === 'Pending' && <span title="Pending Approval"><Clock className="w-4 h-4 text-amber-500" /></span>}
                    {idea.status === 'Approved' && <span title="Approved"><CheckCircle2 className="w-4 h-4 text-green-500" /></span>}
                    {idea.status === 'Rejected' && <span title="Rejected"><XCircle className="w-4 h-4 text-red-500" /></span>}
                  </div>
                </div>
                
                <h4 className="font-semibold text-gray-900 leading-tight mb-1">{idea.title}</h4>
                <p className="text-xs text-gray-500 mb-4 flex-1 line-clamp-2">{idea.description || 'No description provided.'}</p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                  <select 
                    value={idea.status}
                    onChange={(e) => updateIdeaStatus(projectId, idea.id, e.target.value as any)}
                    className={`text-xs font-medium rounded border-0 py-1 pl-2 pr-6 cursor-pointer focus:ring-0 ${
                      idea.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                      idea.status === 'Approved' ? 'bg-green-50 text-green-700' :
                      'bg-red-50 text-red-700'
                    }`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  
                  <button onClick={() => {
                    if (confirm('Delete this item?')) removeIdea(projectId, idea.id, idea.imageUrl);
                  }} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
