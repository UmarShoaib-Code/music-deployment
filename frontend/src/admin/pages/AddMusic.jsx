import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../admin.css';

function AddMusic() {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [category, setCategory] = useState('');
  const [categoryType, setCategoryType] = useState('');
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [categories, setCategories] = useState([]);
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [duration, setDuration] = useState(0);
  const [displayDuration, setDisplayDuration] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/categories`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        setCategories(res.data);
        if (res.data.length > 0) {
          setCategory(res.data[0]._id);
          if (res.data[0].types.length > 0) {
            setCategoryType(res.data[0].types[0]._id);
          } else {
            setCategoryType('');
          }
        }
      } catch (err) {
        console.error('Fetch categories error:', err);
        toast.error('Failed to fetch categories');
      }
    };
    fetchCategories();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const validMimeTypes = ['audio/mpeg', 'audio/wav'];
    const validExtensions = ['.mp3', '.wav'];
    const fileExtension = selectedFile.name.slice(((selectedFile.name.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
    
    if (!validMimeTypes.includes(selectedFile.type) || !validExtensions.includes('.' + fileExtension)) {
      toast.error('Only MP3 and WAV files are allowed');
      setFile(null);
      setDuration(0);
      setDisplayDuration('');
      e.target.value = '';
      return;
    }

    setFile(selectedFile);

    const audio = new Audio(URL.createObjectURL(selectedFile));
    audio.onloadedmetadata = () => {
      const durationInSeconds = Math.round(audio.duration);
      setDuration(durationInSeconds);
      const minutes = Math.floor(durationInSeconds / 60);
      const seconds = durationInSeconds % 60;
      setDisplayDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
    audio.onerror = () => {
      toast.error('Could not read audio file');
      setFile(null);
      setDuration(0);
      setDisplayDuration('');
      e.target.value = '';
    };
  };

  const handleThumbnailChange = (e) => {
    setThumbnail(e.target.files[0]);
  };

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setCategory(newCategory);
    const selectedCategory = categories.find(cat => cat._id === newCategory);
    if (selectedCategory && selectedCategory.types.length > 0) {
      setCategoryType(selectedCategory.types[0]._id);
    } else {
      setCategoryType('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let hasError = false;

    if (!title.trim()) {
      toast.error('Title is required');
      hasError = true;
    }
    if (!artist.trim()) {
      toast.error('Artist is required');
      hasError = true;
    }
    if (!category) {
      toast.error('Category is required');
      hasError = true;
    }
    if (!categoryType) {
      const selectedCategory = categories.find(cat => cat._id === category);
      if (selectedCategory && selectedCategory.types.length > 0) {
        toast.error('Category type is required');
        hasError = true;
      } else {
        toast.error('Selected category has no types available');
        hasError = true;
      }
    }
    if (!file) {
      toast.error('Audio file is required');
      hasError = true;
    }
    if (!thumbnail) {
      toast.error('Thumbnail is required');
      hasError = true;
    }
    if (!releaseDate) {
      toast.error('Release date is required');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('artist', artist);
    formData.append('category', category);
    formData.append('categoryType', categoryType);
    formData.append('file', file);
    formData.append('thumbnail', thumbnail);
    formData.append('duration', duration.toString());
    formData.append('releaseDate', releaseDate);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/music/create`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });

      toast.success('Music added successfully!');
      setTitle('');
      setArtist('');
      setFile(null);
      setThumbnail(null);
      setDuration(0);
      setDisplayDuration('');
      setReleaseDate(new Date().toISOString().split('T')[0]);
      if (categories.length > 0) {
        setCategory(categories[0]._id);
        setCategoryType(categories[0].types.length > 0 ? categories[0].types[0]._id : '');
      }

      setTimeout(() => {
        navigate(`/admin/view-music?newMusicId=${res.data._id}`);
      }, 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add music');
    }
  };

  const selectedCategory = categories.find(cat => cat._id === category) || { types: [] };

  return (
    <div className="card">
      <h2 className="card-title">Add Music</h2>
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
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Title:</label>
          <input
            className="form-control"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter music title"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Artist:</label>
          <input
            className="form-control"
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Enter artist name"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Category:</label>
          <select
            className="form-control"
            value={category}
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
        </div>

        <div className="form-group">
          <label className="form-label">Category Type:</label>
          <select
            className="form-control"
            value={categoryType}
            onChange={(e) => setCategoryType(e.target.value)}
            disabled={selectedCategory.types.length === 0}
            required
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
        </div>

        <div className="form-group">
          <label className="form-label">Audio File (MP3 or WAV):</label>
          <input
            className="form-control"
            type="file"
            accept="audio/mpeg,audio/wav"
            onChange={handleFileChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Thumbnail:</label>
          <input
            className="form-control"
            type="file"
            accept="image/*"
            onChange={handleThumbnailChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Duration:</label>
          <input
            className="form-control"
            type="text"
            value={displayDuration}
            readOnly
          />
        </div>

        <div className="form-group">
          <label className="form-label">Release Date:</label>
          <input
            className="form-control"
            type="date"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary">
          Add Music
        </button>
      </form>
    </div>
  );
}

export default AddMusic;