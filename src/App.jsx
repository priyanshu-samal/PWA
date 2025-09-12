import { useState, useEffect } from 'react';
import './App.css';
import { GoogleGenerativeAI } from '@google/generative-ai';

// IMPORTANT: Replace with your own API key
const API_KEY = 'YOUR_API_KEY';

const genAI = new GoogleGenerativeAI(API_KEY);

function App() {
  const [category, setCategory] = useState('Work');
  const [tone, setTone] = useState('Funny');
  const [excuses, setExcuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savedExcuses, setSavedExcuses] = useState([]);
  const [history, setHistory] = useState([]);
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const storedExcuses = JSON.parse(localStorage.getItem('savedExcuses')) || [];
    setSavedExcuses(storedExcuses);
    const storedHistory = JSON.parse(localStorage.getItem('excuseHistory')) || [];
    setHistory(storedHistory);

    if (offline) {
      getCachedExcuses();
    }
  }, [offline]);

  const getCachedExcuses = async () => {
    try {
      const cache = await caches.open('excuse-cache');
      const response = await cache.match('last-excuses');
      if (response) {
        const data = await response.json();
        setExcuses(data);
      }
    } catch (error) {
      console.error('Error retrieving cached excuses:', error);
    }
  };

  const categories = ['Work', 'School', 'Social', 'Relationships', 'Random'];
  const tones = ['Funny', 'Formal', 'Sarcastic', 'Professional'];

  const generateExcuses = async (random = false) => {
    setLoading(true);
    setExcuses([]);

    let currentCategory = category;
    let currentTone = tone;

    if (random) {
      currentCategory = categories[Math.floor(Math.random() * categories.length)];
      currentTone = tones[Math.floor(Math.random() * tones.length)];
      setCategory(currentCategory);
      setTone(currentTone);
    }

    if (offline) {
      await getCachedExcuses();
      setLoading(false);
      return;
    }
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `Generate 3 clever, context-specific excuses for the following situation:\nCategory: ${currentCategory}\nTone: ${currentTone}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = await response.text();
      const generatedExcuses = text.split('\n').map(e => e.trim()).filter(e => e);
      setExcuses(generatedExcuses);

      // Cache the generated excuses
      const cache = await caches.open('excuse-cache');
      await cache.put('last-excuses', new Response(JSON.stringify(generatedExcuses)));

      // Add to history
      const newHistory = [...history, { category: currentCategory, tone: currentTone, date: new Date().toLocaleString() }];
      setHistory(newHistory);
      localStorage.setItem('excuseHistory', JSON.stringify(newHistory));

    } catch (error) {
      console.error('Error generating excuses:', error);
      alert('Failed to generate excuses. Please check your API key and try again.');
    }
    setLoading(false);
  };

  const saveExcuse = (excuse) => {
    const newSavedExcuses = [...savedExcuses, excuse];
    setSavedExcuses(newSavedExcuses);
    localStorage.setItem('savedExcuses', JSON.stringify(newSavedExcuses));
  };

  const copyExcuse = (excuse) => {
    navigator.clipboard.writeText(excuse);
    alert('Excuse copied to clipboard!');
  };

  const deleteSavedExcuse = (index) => {
    const newSavedExcuses = [...savedExcuses];
    newSavedExcuses.splice(index, 1);
    setSavedExcuses(newSavedExcuses);
    localStorage.setItem('savedExcuses', JSON.stringify(newSavedExcuses));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('excuseHistory');
  };

  return (
    <div className="container">
      <h1>Excuse Generator</h1>
      {offline && <p className="offline-message">You are offline. Showing cached excuses.</p>}
      <div className="form">
        <div className="form-group">
          <label htmlFor="category">Category:</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Tone:</label>
          <div className="tones">
            {tones.map((t) => (
              <label key={t}>
                <input
                  type="radio"
                  name="tone"
                  value={t}
                  checked={tone === t}
                  onChange={() => setTone(t)}
                />
                {t}
              </label>
            ))}
          </div>
        </div>
        <div className="form-buttons">
          <button onClick={() => generateExcuses(false)} disabled={loading || offline}>
            {loading ? 'Generating...' : 'Generate Excuses'}
          </button>
          <button onClick={() => generateExcuses(true)} disabled={loading || offline}>
            Excuse Roulette
          </button>
        </div>
      </div>
      <div className="excuses">
        {excuses.map((excuse, index) => (
          <div key={index} className="excuse">
            <p>{excuse}</p>
            <div className="actions">
              <button onClick={() => saveExcuse(excuse)}>Save</button>
              <button onClick={() => copyExcuse(excuse)}>Copy</button>
            </div>
          </div>
        ))}
      </div>

      {savedExcuses.length > 0 && (
        <div className="saved-excuses">
          <h2>Saved Excuses</h2>
          {savedExcuses.map((excuse, index) => (
            <div key={index} className="excuse">
              <p>{excuse}</p>
              <div className="actions">
                <button onClick={() => deleteSavedExcuse(index)}>Delete</button>
                <button onClick={() => copyExcuse(excuse)}>Copy</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="history">
          <h2>Excuse History</h2>
          <button onClick={clearHistory}>Clear History</button>
          <ul>
            {history.map((item, index) => (
              <li key={index}>
                {item.date}: {item.category} ({item.tone})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
