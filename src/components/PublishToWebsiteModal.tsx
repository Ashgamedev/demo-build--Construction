import { useState, useEffect } from 'react';
import { X, Upload, Globe, Copy, CheckCircle, Share2, ExternalLink } from 'lucide-react';
import { usePublicProjectStore } from '../store/publicProjectStore';
import { useAuthStore } from '../store/authStore';
import { Project, ProjectIdea } from '../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { caseStudyUrl } from '../config/site';

interface PublishToWebsiteModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function PublishToWebsiteModal({ project, isOpen, onClose }: PublishToWebsiteModalProps) {
  const { publishProject, publicProjects, fetchPublicProjects, unpublishProject } = usePublicProjectStore();
  const currentUser = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  
  const existingPublicProject = publicProjects.find(p => p.internalProjectId === project.id);
  
  const [formData, setFormData] = useState({
    title: project.title,
    category: project.type === 'Complete Construction' ? 'Residential' : project.type as any,
    description: project.scopeSummary || '',
    featuredImage: '',
    gallery: [] as string[],
    duration: '',
    area: '',
    location: project.siteAddress.split(',')[0] || '',
    client: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchPublicProjects();
      fetchProjectImages();
    }
  }, [isOpen, project.id]);

  useEffect(() => {
    if (existingPublicProject) {
      setFormData({
        title: existingPublicProject.title,
        category: existingPublicProject.category,
        description: existingPublicProject.description,
        featuredImage: existingPublicProject.featuredImage,
        gallery: existingPublicProject.gallery,
        duration: existingPublicProject.keyHighlights.duration || '',
        area: existingPublicProject.keyHighlights.area || '',
        location: existingPublicProject.keyHighlights.location || '',
        client: existingPublicProject.keyHighlights.client || ''
      });
    }
  }, [existingPublicProject]);

  const fetchProjectImages = async () => {
    // Plans & Ideas are stored as a subcollection of the project, not a top-level collection.
    try {
      const ideasSnap = await getDocs(collection(db, `projects/${project.id}/ideas`));
      const allImages = [...new Set(
        ideasSnap.docs
          .map(d => d.data() as ProjectIdea)
          .filter(i => i.imageUrl)
          .map(i => i.imageUrl as string)
      )];

      setImages(allImages);

      if (allImages.length > 0 && !formData.featuredImage && !existingPublicProject) {
        setFormData(prev => ({ ...prev, featuredImage: allImages[0] }));
      }
    } catch (e) {
      console.error("Error fetching images", e);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.featuredImage) {
      alert("Please select a featured image");
      return;
    }
    
    setLoading(true);
    try {
      await publishProject({
        internalProjectId: project.id,
        title: formData.title,
        category: formData.category,
        description: formData.description,
        featuredImage: formData.featuredImage,
        gallery: formData.gallery,
        keyHighlights: {
          duration: formData.duration,
          area: formData.area,
          location: formData.location,
          client: formData.client
        },
        isPublished: true,
        publishedBy: currentUser?.name || currentUser?.email || 'Unknown user'
      });
      alert('Project published to website successfully!');
      onClose();
    } catch (err: any) {
      alert('Failed to publish: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnpublish = async () => {
    if (!existingPublicProject) return;
    if (!confirm('Are you sure you want to unpublish this project from the website?')) return;
    
    setLoading(true);
    try {
      await unpublishProject(existingPublicProject.id);
      alert('Project unpublished.');
      onClose();
    } catch (err: any) {
      alert('Failed to unpublish: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!existingPublicProject) return;
    navigator.clipboard.writeText(caseStudyUrl(existingPublicProject.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    if (!existingPublicProject) return;
    const message =
      `*${existingPublicProject.title}*\n\n` +
      `A recent ${existingPublicProject.category.toLowerCase()} project by Deepthi Construction. ` +
      `You can see photos and full details here:\n\n${caseStudyUrl(existingPublicProject.id)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const toggleGalleryImage = (url: string) => {
    setFormData(prev => {
      const isSelected = prev.gallery.includes(url);
      if (isSelected) {
        return { ...prev, gallery: prev.gallery.filter(u => u !== url) };
      } else {
        return { ...prev, gallery: [...prev.gallery, url] };
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Publish to Website
            </h2>
            <p className="text-sm text-gray-500 mt-1">Create a public case study for your portfolio</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {existingPublicProject && (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-green-800 font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" /> Currently Published
                </span>
                <p className="text-green-700 text-sm mt-1">This project is live on the website.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={shareOnWhatsApp}
                  className="px-4 py-2 bg-green-600 text-white rounded shadow-sm text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share on WhatsApp
                </button>
                <a
                  href={caseStudyUrl(existingPublicProject.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-white border border-green-300 text-green-700 rounded shadow-sm text-sm font-medium hover:bg-green-50 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Preview
                </a>
                <button
                  type="button"
                  onClick={copyLink}
                  className="px-4 py-2 bg-white border border-green-300 text-green-700 rounded shadow-sm text-sm font-medium hover:bg-green-50 flex items-center gap-2"
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  type="button"
                  onClick={handleUnpublish}
                  className="px-4 py-2 bg-red-50 text-red-700 rounded border border-red-200 shadow-sm text-sm font-medium hover:bg-red-100"
                >
                  Unpublish
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* General Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Public Title</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Interior">Interior</option>
                  <option value="Exterior">Exterior</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Story / Description</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded p-3 h-32 focus:ring-2 focus:ring-blue-500"
                  placeholder="Write a compelling case study description for prospective clients..."
                  required
                />
              </div>
            </div>

            {/* Key Highlights */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Key Highlights</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Duration</label>
                  <input type="text" value={formData.duration} onChange={e => setFormData(p => ({...p, duration: e.target.value}))} placeholder="e.g. 14 Months" className="w-full border border-gray-300 rounded p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Total Area</label>
                  <input type="text" value={formData.area} onChange={e => setFormData(p => ({...p, area: e.target.value}))} placeholder="e.g. 4500 Sq.Ft" className="w-full border border-gray-300 rounded p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                  <input type="text" value={formData.location} onChange={e => setFormData(p => ({...p, location: e.target.value}))} placeholder="e.g. Noida, UP" className="w-full border border-gray-300 rounded p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Client Type</label>
                  <input type="text" value={formData.client} onChange={e => setFormData(p => ({...p, client: e.target.value}))} placeholder="e.g. Private / Corporate" className="w-full border border-gray-300 rounded p-2 text-sm" />
                </div>
              </div>
            </div>

            {/* Images */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4" /> Media & Gallery
              </h3>
              
              {images.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">No images found for this project. Please upload photos to the project first.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Featured Image (Thumbnail)</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {images.map((url, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setFormData(p => ({...p, featuredImage: url}))}
                          className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${formData.featuredImage === url ? 'border-blue-500 shadow-md scale-105' : 'border-transparent hover:border-blue-300'}`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {formData.featuredImage === url && (
                            <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                              <CheckCircle className="text-white w-6 h-6 drop-shadow" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Gallery Images (Multiple)</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {images.filter(img => img !== formData.featuredImage).map((url, idx) => {
                        const isSelected = formData.gallery.includes(url);
                        return (
                          <div 
                            key={idx} 
                            onClick={() => toggleGalleryImage(url)}
                            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-green-500 shadow-md' : 'border-transparent hover:border-gray-300'}`}
                          >
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            {isSelected && (
                              <div className="absolute top-2 right-2 bg-green-500 rounded-full p-0.5">
                                <CheckCircle className="text-white w-4 h-4" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="px-3 sm:px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                {existingPublicProject ? 'Update Published Project' : 'Publish to Website'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
