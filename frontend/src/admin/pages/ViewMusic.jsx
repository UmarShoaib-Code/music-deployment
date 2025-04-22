import { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../admin.css';
import './ViewMusic.css';

function ViewMusic() {
  const [musicList, setMusicList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCategoryType, setEditCategoryType] = useState('');
  const [editThumbnail, setEditThumbnail] = useState(null);
  const [editAudio, setEditAudio] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [currentTimes, setCurrentTimes] = useState({});
  const [durations, setDurations] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [musicPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [sortOption, setSortOption] = useState('alphabetical-asc');
  const [isLoading, setIsLoading] = useState(true);
  const [thumbnailLoading, setThumbnailLoading] = useState({});
  const audioRefs = useRef({});
  const musicRefs = useRef({});
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const loadedImagesRef = useRef(new Set());
  const location = useLocation();

  const fetchMusic = async () => {
    console.log('fetchMusic started, isLoading:', isLoading);
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to view music');
        return;
      }
      const [musicRes, categoriesRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/music`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/categories`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }),
      ]);

      console.log(
        'Music data:',
        musicRes.data.map(m => ({
          id: m._id,
          title: m.title,
          releaseDate: m.releaseDate,
          createdAt: m.createdAt,
          thumbnailUrl: m.thumbnailUrl,
        }))
      );

      // Warn about missing or time-less timestamps
      const missingReleaseDates = musicRes.data.filter(
        m => !m.releaseDate || isNaN(new Date(m.releaseDate))
      );
      const timeLessReleaseDates = musicRes.data.filter(
        m => m.releaseDate && !isNaN(new Date(m.releaseDate)) && !m.releaseDate.includes('T')
      );
      if (missingReleaseDates.length > 0) {
        console.warn(
          'Missing or invalid releaseDate for items:',
          missingReleaseDates.map(m => ({ id: m._id, title: m.title }))
        );
        toast.warn(`${missingReleaseDates.length} music items lack valid release dates, using createdAt`);
      }
      if (timeLessReleaseDates.length > 0) {
        console.warn(
          'releaseDate lacks time component for items:',
          timeLessReleaseDates.map(m => ({ id: m._id, title: m.title, releaseDate: m.releaseDate }))
        );
        toast.warn(`${timeLessReleaseDates.length} music items have date-only release dates, time precision may be lost`);
      }

      setMusicList(musicRes.data);
      setCategories(categoriesRes.data);
      setCurrentTimes(prev => ({
        ...prev,
        ...musicRes.data.reduce((acc, music) => {
          if (!(music._id in prev)) acc[music._id] = 0;
          return acc;
        }, {}),
      }));
      setDurations(prev => ({
        ...prev,
        ...musicRes.data.reduce((acc, music) => {
          if (!(music._id in prev)) acc[music._id] = 0;
          return acc;
        }, {}),
      }));
      setThumbnailLoading(prev => ({
        ...prev,
        ...musicRes.data.reduce((acc, music) => {
          acc[music._id] = !loadedImagesRef.current.has(music._id);
          return acc;
        }, {}),
      }));
      console.log('fetchMusic completed successfully');
    } catch (err) {
      console.error('Fetch music error:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch music');
    } finally {
      setIsLoading(false);
      console.log('fetchMusic finished, isLoading:', false);
    }
  };

  useEffect(() => {
    fetchMusic();
  }, []);

  // Reset page to 1 when sortOption changes
  useEffect(() => {
    console.log('sortOption changed:', sortOption);
    setCurrentPage(1);
  }, [sortOption]);

  const handleThumbnailLoad = (id) => {
    if (!loadedImagesRef.current.has(id)) {
      console.log('Thumbnail loaded:', id);
      loadedImagesRef.current.add(id);
      setThumbnailLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleThumbnailError = (id, e, setSrc) => {
    console.log('Thumbnail error:', id, e);
    if (!loadedImagesRef.current.has(id)) {
      loadedImagesRef.current.add(id);
      setThumbnailLoading(prev => ({ ...prev, [id]: false }));
      e.target.onerror = null;
      setSrc(placeholderImage);
    }
  };

  useEffect(() => {
    return () => {
      if (editThumbnail) {
        URL.revokeObjectURL(URL.createObjectURL(editThumbnail));
      }
    };
  }, [editThumbnail]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setCurrentPage(1);

    if (query.length >= 2) {
      const lowerQuery = query.toLowerCase();
      const suggestionSet = new Set();

      musicList.forEach(music => {
        if (music.title.toLowerCase().includes(lowerQuery)) {
          suggestionSet.add(`Title: ${music.title}`);
        }
        if (music.artist.toLowerCase().includes(lowerQuery)) {
          suggestionSet.add(`Artist: ${music.artist}`);
        }
        if (music.category?.name.toLowerCase().includes(lowerQuery)) {
          suggestionSet.add(`Category: ${music.category.name}`);
        }
        if (music.categoryType?.name.toLowerCase().includes(lowerQuery)) {
          suggestionSet.add(`Type: ${music.categoryType.name}`);
        }
      });

      const suggestionArray = Array.from(suggestionSet).slice(0, 20);
      setSuggestions(suggestionArray);
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const query = suggestion.split(': ')[1];
    setSearchQuery(query);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setCurrentPage(1);
    searchInputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, highlightedIndex, showSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMusic = musicList.filter(music => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      music.title.toLowerCase().includes(lowerQuery) ||
      music.artist.toLowerCase().includes(lowerQuery) ||
      (music.category?.name.toLowerCase().includes(lowerQuery)) ||
      (music.categoryType?.name.toLowerCase().includes(lowerQuery))
    );
  });

  const sortedMusic = [...filteredMusic].sort((a, b) => {
    switch (sortOption) {
      case 'alphabetical-asc':
        return a.title.localeCompare(b.title);
      case 'alphabetical-desc':
        return b.title.localeCompare(a.title);
      case 'newest': {
        // Parse timestamps
        const dateA = new Date(a.releaseDate || a.createdAt);
        const dateB = new Date(b.releaseDate || b.createdAt);
        // Compare timestamps (in milliseconds)
        const timeDiff = dateB.getTime() - dateA.getTime();
        // Secondary sort by title if timestamps are equal
        return timeDiff !== 0 ? timeDiff : a.title.localeCompare(b.title);
      }
      case 'oldest': {
        const dateA = new Date(a.releaseDate || a.createdAt);
        const dateB = new Date(b.releaseDate || b.createdAt);
        const timeDiff = dateA.getTime() - dateB.getTime();
        return timeDiff !== 0 ? timeDiff : a.title.localeCompare(b.title);
      }
      default:
        return 0;
    }
  });

  // Log sortedMusic with parsed timestamps for debugging
  useEffect(() => {
    console.log(
      'sortedMusic order:',
      sortedMusic.map(m => ({
        id: m._id,
        title: m.title,
        releaseDate: m.releaseDate,
        createdAt: m.createdAt,
        timestamp: new Date(m.releaseDate || m.createdAt).getTime(),
      }))
    );
  }, [sortedMusic]);

  // Log music-card-container styles
  useEffect(() => {
    if (containerRef.current) {
      const styles = getComputedStyle(containerRef.current);
      console.log('music-card-container styles:', {
        display: styles.display,
        flexDirection: styles.flexDirection,
        justifyContent: styles.justifyContent,
        direction: styles.direction,
      });
    }
  }, [musicList]);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const newMusicId = query.get('newMusicId');
    if (newMusicId && musicList.length > 0 && sortOption !== 'newest') {
      const musicIndex = sortedMusic.findIndex(music => music._id === newMusicId);
      if (musicIndex !== -1) {
        const targetPage = Math.floor(musicIndex / musicPerPage) + 1;
        setCurrentPage(targetPage);
        setTimeout(() => {
          const musicCard = document.querySelector(`div[data-music-id="${newMusicId}"]`);
          if (musicCard) {
            musicCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else if (containerRef.current) {
            containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    }
  }, [musicList, location.search, musicPerPage, sortedMusic, sortOption]);

  const indexOfLastMusic = currentPage * musicPerPage;
  const indexOfFirstMusic = indexOfLastMusic - musicPerPage;
  const currentMusic = sortedMusic.slice(indexOfFirstMusic, indexOfLastMusic);
  const totalPages = Math.ceil(sortedMusic.length / musicPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this music?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/music/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setMusicList(musicList.filter(music => music._id !== id));
      setThumbnailLoading(prev => {
        const newLoading = { ...prev };
        delete newLoading[id];
        return newLoading;
      });
      loadedImagesRef.current.delete(id);
      toast.success('Music deleted successfully!');
      if (currentMusic.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete music');
    }
  };

  const handleEdit = (music) => {
    setEditingId(music._id);
    setEditTitle(music.title);
    setEditArtist(music.artist);
    setEditCategory(music.category?._id || '');
    setEditCategoryType(music.categoryType?._id || '');
    setEditThumbnail(null);
    setThumbnailLoading(prev => ({ ...prev, [music._id]: !loadedImagesRef.current.has(music._id) }));
  };

  const handleUpdate = async (id) => {
    let hasError = false;

    if (!editTitle.trim()) {
      toast.error('Title is required');
      hasError = true;
    }
    if (!editArtist.trim()) {
      toast.error('Artist is required');
      hasError = true;
    }
    if (!editCategory) {
      toast.error('Category is required');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      formData.append('title', editTitle);
      formData.append('artist', editArtist);
      formData.append('category', editCategory);
      if (editCategoryType) formData.append('categoryType', editCategoryType);
      if (editThumbnail) formData.append('thumbnail', editThumbnail);
      if (editAudio) formData.append('file', editAudio);

      await axios.put(
        `${import.meta.env.VITE_API_URL}/music/${id}`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          withCredentials: true,
        }
      );

      await fetchMusic();
      loadedImagesRef.current.delete(id);
      setEditingId(null);
      setEditThumbnail(null);
      setEditAudio(null);
      toast.success('Music updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update music');
    }
  };

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setEditCategory(newCategory);
    const selectedCategory = categories.find(cat => cat._id === newCategory);
    if (selectedCategory && selectedCategory.types.length > 0) {
      setEditCategoryType(selectedCategory.types[0]._id);
    } else {
      setEditCategoryType('');
    }
  };

  const togglePlayPause = (id) => {
    const audio = audioRefs.current[id];
    if (!audio) return;

    if (playingId === id) {
      audio.pause();
      setPlayingId(null);
    } else {
      if (playingId) {
        audioRefs.current[playingId].pause();
        setCurrentTimes(prev => ({ ...prev, [playingId]: audioRefs.current[playingId].currentTime }));
      }
      audio.play().catch(err => console.error('Playback error:', err));
      setPlayingId(id);
    }
  };

  const handleTimeUpdate = (id) => {
    const audio = audioRefs.current[id];
    if (audio) {
      setCurrentTimes(prev => ({ ...prev, [id]: audio.currentTime }));
    }
  };

  const handleLoadedMetadata = (id) => {
    const audio = audioRefs.current[id];
    if (audio && !isNaN(audio.duration) && audio.duration > 0) {
      setDurations(prev => ({ ...prev, [id]: audio.duration }));
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const placeholderImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAjWjB1QAAAABJRU5ErkJggg==';

  const selectedCategory = categories.find(cat => cat._id === editCategory) || { types: [] };

  console.log('thumbnailLoading state:', thumbnailLoading);

  return (
    <div className="view-music">
      <h2>View Music</h2>
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      {isLoading ? (
        <div className="loader-container">
          <div className="loader"></div>
          <p>Loading music...</p>
        </div>
      ) : sortedMusic.length === 0 ? (
        <p>No music found.</p>
      ) : (
        <>
          <div className="search-sort-container" style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
            <div className="search-container" style={{ position: 'relative', flex: '1' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by title, artist, category, or type..."
                value={searchQuery}
                onChange={handleSearchChange}
                ref={searchInputRef}
                aria-label="Search music"
                disabled={isLoading}
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="suggestions-list" ref={suggestionsRef}>
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      className={`suggestion-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="sort-container">
              <select
                className="form-control"
                value={sortOption}
                onChange={(e) => {
                  console.log('Selected sort:', e.target.value);
                  setSortOption(e.target.value);
                }}
                aria-label="Sort music"
                disabled={isLoading}
              >
                <option value="alphabetical-asc">Alphabetical (A-Z)</option>
                <option value="alphabetical-desc">Alphabetical (Z-A)</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
          <div className="music-card-container" ref={containerRef}>
            {currentMusic.map(music => (
              <div 
                key={music._id} 
                className="music-card"
                data-music-id={music._id}
                ref={(el) => (musicRefs.current[music._id] = el)}
              >
                {editingId === music._id ? (
                  <div className="edit-form">
                    <div className="thumbnail-preview">
                      <div className={`thumbnail-wrapper ${thumbnailLoading[music._id] ? 'shimmer' : ''}`}>
                        <img
                          src={
                            editThumbnail 
                              ? URL.createObjectURL(editThumbnail)
                              : music.thumbnailUrl || placeholderImage
                          }
                          alt="Thumbnail preview"
                          className="music-thumbnail"
                          onLoad={() => handleThumbnailLoad(music._id)}
                          onError={(e) => handleThumbnailError(music._id, e, src => e.target.src = src)}
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Enter music title"
                      required
                    />
                    <input
                      type="text"
                      value={editArtist}
                      onChange={(e) => setEditArtist(e.target.value)}
                      placeholder="Enter artist name"
                      required
                    />
                    <select
                      value={editCategory}
                      onChange={handleCategoryChange}
                      required
                    >
                      {categories.length === 0 ? (
                        <option value="">No categories available</option>
                      ) : (
                        categories.map((cat) => (
                          <option key={cat._id} value={cat._id}>
                            {cat.name}
                          </option>
                        ))
                      )}
                    </select>
                    <select
                      value={editCategoryType}
                      onChange={(e) => setEditCategoryType(e.target.value)}
                      disabled={selectedCategory.types.length === 0}
                    >
                      {selectedCategory.types.length === 0 ? (
                        <option value="">No types available</option>
                      ) : (
                        selectedCategory.types.map((type) => (
                          <option key={type._id} value={type._id}>
                            {type.name}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="file-inputs">
                      <div className="file-input-group">
                        <label>Update Thumbnail (optional):</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (editThumbnail) {
                              URL.revokeObjectURL(URL.createObjectURL(editThumbnail));
                            }
                            setEditThumbnail(e.target.files[0]);
                            setThumbnailLoading(prev => ({ ...prev, [music._id]: true }));
                            loadedImagesRef.current.delete(music._id);
                          }}
                        />
                      </div>
                      <div className="file-input-group">
                        <label>Update Audio File (optional):</label>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => setEditAudio(e.target.files[0])}
                        />
                        {music.fileUrl && !editAudio && (
                          <small>Current file: {music.fileUrl.split('/').pop()}</small>
                        )}
                      </div>
                    </div>
                    <div className="edit-buttons">
                      <button onClick={() => handleUpdate(music._id)}>Update</button>
                      <button onClick={() => {
                        setEditingId(null);
                        setEditThumbnail(null);
                        setEditAudio(null);
                        setThumbnailLoading(prev => ({ ...prev, [music._id]: !loadedImagesRef.current.has(music._id) }));
                        if (editThumbnail) {
                          URL.revokeObjectURL(URL.createObjectURL(editThumbnail));
                        }
                      }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`thumbnail-wrapper ${thumbnailLoading[music._id] ? 'shimmer' : ''}`}>
                      <img
                        src={music.thumbnailUrl || placeholderImage}
                        alt={music.title}
                        className="music-thumbnail"
                        onLoad={() => handleThumbnailLoad(music._id)}
                        onError={(e) => handleThumbnailError(music._id, e, src => e.target.src = src)}
                      />
                    </div>
                    <h3>{music.title}</h3>
                    <p>Artist: {music.artist}</p>
                    <p>Category: {music.category?.name || 'Unknown'}</p>
                    <p>Type: {music.categoryType?.name || 'None'}</p>
                    <div className="custom-player">
                      <button
                        className="play-pause-btn"
                        onClick={() => togglePlayPause(music._id)}
                        disabled={!music.fileUrl}
                      >
                        {playingId === music._id ? <FaPause /> : <FaPlay />}
                      </button>
                      <span className="time-display">
                        {formatTime(currentTimes[music._id])} / {formatTime(durations[music._id])}
                      </span>
                      <input
                        type="range"
                        min="0"
                        max={durations[music._id] || 0}
                        value={currentTimes[music._id] || 0}
                        onChange={(e) => {
                          const audio = audioRefs.current[music._id];
                          if (audio) {
                            audio.currentTime = e.target.value;
                            setCurrentTimes(prev => ({ 
                              ...prev, 
                              [music._id]: parseFloat(e.target.value) 
                            }));
                          }
                        }}
                        className="progress-bar"
                        disabled={!music.fileUrl}
                      />
                      {music.fileUrl ? (
                        <audio
                          ref={(el) => (audioRefs.current[music._id] = el)}
                          onTimeUpdate={() => handleTimeUpdate(music._id)}
                          onLoadedMetadata={() => handleLoadedMetadata(music._id)}
                          onError={(e) => console.log('Audio failed:', music.fileUrl, e)}
                        >
                          <source src={music.fileUrl} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      ) : (
                        <p>Audio file not available</p>
                      )}
                    </div>
                    <div className="action-buttons">
                      <button onClick={() => handleEdit(music)}>Update</button>
                      <button onClick={() => handleDelete(music._id)}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="pagination" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index + 1}
                className={`btn ${currentPage === index + 1 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => paginate(index + 1)}
              >
                {index + 1}
              </button>
            ))}
            <button
              className="btn btn-secondary"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ViewMusic;