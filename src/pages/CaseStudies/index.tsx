import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe, Share2, Copy, CheckCircle, ExternalLink, Search,
  ImageOff, Loader2, ArrowRight
} from 'lucide-react';
import { usePublicProjectStore } from '../../store/publicProjectStore';
import { useProjectStore } from '../../store/projectStore';
import { caseStudyUrl, PUBLIC_SITE_URL } from '../../config/site';
import { PublicProject } from '../../types';

const CATEGORIES = ['All', 'Residential', 'Commercial', 'Interior', 'Exterior', 'Custom'] as const;

export function CaseStudies() {
  const { publicProjects, fetchPublicProjects, loading } = usePublicProjectStore();
  const { projects, subscribeProjects } = useProjectStore();
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicProjects();
    const unsub = subscribeProjects();
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [fetchPublicProjects, subscribeProjects]);

  const copyLink = (cs: PublicProject) => {
    navigator.clipboard.writeText(caseStudyUrl(cs.id));
    setCopiedId(cs.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareOnWhatsApp = (cs: PublicProject) => {
    const message =
      `*${cs.title}*\n\n` +
      `A recent ${cs.category.toLowerCase()} project by Deepthi Construction. ` +
      `You can see photos and full details here:\n\n${caseStudyUrl(cs.id)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const visible = publicProjects
    .filter(cs => filter === 'All' || cs.category === filter)
    .filter(cs => cs.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));

  // Completed projects that haven't been turned into a case study yet.
  const publishedInternalIds = new Set(publicProjects.map(p => p.internalProjectId));
  const candidates = projects.filter(
    p => p.status === 'Completed' && !publishedInternalIds.has(p.id)
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Case Studies</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your best work, published to the website and ready to share with prospects.
          </p>
        </div>
        <a
          href={`${PUBLIC_SITE_URL}/projects`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
          View public portfolio
        </a>
      </div>

      {/* Prompt to publish completed work that isn't live yet */}
      {candidates.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 mb-2">
            {candidates.length} completed {candidates.length === 1 ? 'project is' : 'projects are'} not on the website yet
          </p>
          <div className="flex flex-wrap gap-2">
            {candidates.slice(0, 4).map(p => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded text-sm text-blue-800 hover:bg-blue-100"
              >
                {p.title}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search case studies..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === c
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading && publicProjects.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading case studies...
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-gray-300 rounded-lg">
          <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-900 font-medium">
            {publicProjects.length === 0 ? 'No case studies published yet' : 'Nothing matches that search'}
          </p>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            {publicProjects.length === 0
              ? 'Open any completed project and choose "Publish to Website" to turn it into a shareable case study.'
              : 'Try a different category or search term.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visible.map(cs => (
            <div
              key={cs.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="relative h-44 bg-gray-100">
                {cs.featuredImage ? (
                  <img src={cs.featuredImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ImageOff className="w-8 h-8" />
                  </div>
                )}
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs font-medium rounded">
                  {cs.category}
                </span>
                {cs.gallery?.length > 0 && (
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                    +{cs.gallery.length} photos
                  </span>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold text-gray-900 leading-snug mb-1">{cs.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{cs.description}</p>

                <dl className="text-xs text-gray-500 space-y-0.5 mb-4">
                  {cs.keyHighlights?.location && <div><dt className="inline font-medium">Location: </dt><dd className="inline">{cs.keyHighlights.location}</dd></div>}
                  {cs.keyHighlights?.area && <div><dt className="inline font-medium">Area: </dt><dd className="inline">{cs.keyHighlights.area}</dd></div>}
                  {cs.keyHighlights?.duration && <div><dt className="inline font-medium">Duration: </dt><dd className="inline">{cs.keyHighlights.duration}</dd></div>}
                </dl>

                <div className="mt-auto flex items-center gap-1.5 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => shareOnWhatsApp(cs)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </button>
                  <button
                    onClick={() => copyLink(cs)}
                    title="Copy link"
                    className="px-2 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                  >
                    {copiedId === cs.id
                      ? <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={caseStudyUrl(cs.id)}
                    target="_blank"
                    rel="noreferrer"
                    title="Preview on website"
                    className="px-2 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <Link
                    to={`/projects/${cs.internalProjectId}`}
                    title="Open the project this came from"
                    className="px-2 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
