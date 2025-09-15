import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Snackbar,
  Alert,
  Box,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Save as SaveIcon,
  FileCopy as FileCopyIcon,
  Delete as DeleteIcon,
  Casino as CasinoIcon,
  History as HistoryIcon,
  ClearAll as ClearAllIcon,
} from '@mui/icons-material';
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
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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
      const generatedExcuses = text.split('\n').map(e => e.trim()).filter(e => e && e.length > 1 && !e.startsWith('*'));
      setExcuses(generatedExcuses);

      const cache = await caches.open('excuse-cache');
      await cache.put('last-excuses', new Response(JSON.stringify(generatedExcuses)));

      const newHistory = [...history, { category: currentCategory, tone: currentTone, date: new Date().toLocaleString() }];
      setHistory(newHistory);
      localStorage.setItem('excuseHistory', JSON.stringify(newHistory));

    } catch (error) {
      console.error('Error generating excuses:', error);
      setSnackbar({ open: true, message: 'Failed to generate excuses. Please check your API key.', severity: 'error' });
    }
    setLoading(false);
  };

  const saveExcuse = (excuse) => {
    if (savedExcuses.includes(excuse)) {
        setSnackbar({ open: true, message: 'Excuse already saved!', severity: 'warning' });
        return;
      }
    const newSavedExcuses = [...savedExcuses, excuse];
    setSavedExcuses(newSavedExcuses);
    localStorage.setItem('savedExcuses', JSON.stringify(newSavedExcuses));
    setSnackbar({ open: true, message: 'Excuse saved!', severity: 'success' });
  };

  const copyExcuse = (excuse) => {
    navigator.clipboard.writeText(excuse);
    setSnackbar({ open: true, message: 'Excuse copied to clipboard!', severity: 'info' });
  };

  const deleteSavedExcuse = (index) => {
    const newSavedExcuses = [...savedExcuses];
    newSavedExcuses.splice(index, 1);
    setSavedExcuses(newSavedExcuses);
    localStorage.setItem('savedExcuses', JSON.stringify(newSavedExcuses));
    setSnackbar({ open: true, message: 'Excuse deleted.', severity: 'success' });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('excuseHistory');
    setSnackbar({ open: true, message: 'History cleared.', severity: 'success' });
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="md" sx={{ my: 4 }}>
      <Card sx={{ p: 3, boxShadow: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
          Excuse Generator
        </Typography>
        {offline && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You are offline. Showing cached excuses.
          </Alert>
        )}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="category-label">Category</InputLabel>
              <Select
                labelId="category-label"
                id="category"
                value={category}
                label="Category"
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl component="fieldset">
              <RadioGroup row aria-label="tone" name="tone" value={tone} onChange={(e) => setTone(e.target.value)}>
                {tones.map((t) => (
                  <FormControlLabel key={t} value={t} control={<Radio />} label={t} />
                ))}
              </RadioGroup>
            </FormControl>
          </Grid>
          <Grid item xs={12} container spacing={2} justifyContent="center">
            <Grid item>
                <Button
                    variant="contained"
                    onClick={() => generateExcuses(false)}
                    disabled={loading || offline}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                    {loading ? 'Generating...' : 'Generate Excuses'}
                </Button>
            </Grid>
            <Grid item>
                <Button
                    variant="outlined"
                    onClick={() => generateExcuses(true)}
                    disabled={loading || offline}
                    startIcon={<CasinoIcon />}
                >
                    Excuse Roulette
                </Button>
            </Grid>
          </Grid>
        </Grid>
      </Card>

      {excuses.length > 0 && (
        <Box mt={4}>
            <Typography variant="h5" component="h2" gutterBottom align="center">
                Generated Excuses
            </Typography>
            <Grid container spacing={2}>
                {excuses.map((excuse, index) => (
                <Grid item xs={12} key={index}>
                    <Card variant="outlined">
                    <CardContent>
                        <Typography>{excuse}</Typography>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'flex-end' }}>
                        <IconButton onClick={() => saveExcuse(excuse)} color="primary">
                            <SaveIcon />
                        </IconButton>
                        <IconButton onClick={() => copyExcuse(excuse)}>
                            <FileCopyIcon />
                        </IconButton>
                    </CardActions>
                    </Card>
                </Grid>
                ))}
            </Grid>
        </Box>
      )}

      {savedExcuses.length > 0 && (
        <Box mt={4}>
          <Typography variant="h5" component="h2" gutterBottom align="center">
            Saved Excuses
          </Typography>
          <Grid container spacing={2}>
            {savedExcuses.map((excuse, index) => (
              <Grid item xs={12} key={index}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography>{excuse}</Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end' }}>
                    <IconButton onClick={() => deleteSavedExcuse(index)} color="secondary">
                      <DeleteIcon />
                    </IconButton>
                    <IconButton onClick={() => copyExcuse(excuse)}>
                      <FileCopyIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {history.length > 0 && (
        <Box mt={4}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" component="h2" gutterBottom>
                    <HistoryIcon sx={{ verticalAlign: 'middle', mr: 1 }}/> Excuse History
                </Typography>
                <Button onClick={clearHistory} startIcon={<ClearAllIcon />} color="secondary">
                    Clear History
                </Button>
            </Box>
          <Card variant="outlined">
            <List dense>
              {history.map((item, index) => (
                <div key={index}>
                  <ListItem>
                    <ListItemText primary={`${item.category} (${item.tone})`} secondary={item.date} />
                  </ListItem>
                  {index < history.length - 1 && <Divider />}
                </div>
              ))}
            </List>
          </Card>
        </Box>
      )}

        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
            <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                {snackbar.message}
            </Alert>
        </Snackbar>
    </Container>
  );
}

export default App;