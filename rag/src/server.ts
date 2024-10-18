// rag/src/server.ts
import express, { Request, Response } from 'express';
import { RAGSystem } from './ragSystem';
import { loadDocuments } from './documentLoader';
import { Logger } from './logger';
import cors from 'cors';
import multer from 'multer';
import session from 'express-session';

const app = express();
const port = 3001;
app.use(cors());
app.use(express.json());
app.use(session({
  secret: 'your-secret-key', // Replace with your secret key
  resave: false,
  saveUninitialized: true,
}));
app.use(express.json());

let ragSystem: RAGSystem | null = null; // Initialize ragSystem as null

async function initializeRAGSystem() {
  const logger = Logger.getInstance();
  await logger.log('Starting RAG system');

  ragSystem = new RAGSystem();
  await logger.log('Loading documents');
  
  const documentPaths = ['./docs/doc1.txt', './docs/doc2.txt']; // Add more document paths if needed
  const documents = await loadDocuments(documentPaths);

  await logger.log('Initializing vector store and adding documents if necessary');
  await ragSystem.initialize(documents);
  
  await logger.log('RAG system initialized successfully');
}

// Initialize RAG system once during server startup
initializeRAGSystem().catch(error => {
  const logger = Logger.getInstance();
  logger.log('Error initializing RAG system', error);
  console.error('Failed to initialize RAG system:', error);
});

// Endpoint to handle user queries
app.post('/query', async (req: Request, res: Response) => {
    const logger = Logger.getInstance();
    const { question } = req.body;
  
    // Check if RAG system is initialized
    if (!ragSystem) {
      return res.status(503).json({ error: 'RAG system is still initializing. Please try again later.' });
    }
  
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
  
    await logger.log('Processing user question', { question });
  
    try {
      const result = await ragSystem.query(question);
      await logger.log('Question processed successfully', { result });
  
      res.json({
        answer: result.answer,
        sources: result.sources,
      });
    } catch (error) {
      await logger.log('Error processing question', error);
      console.error('Error occurred while processing the question:', error);
      res.status(500).json({ error: 'An error occurred while processing your question' });
    }
});

// Endpoint to start a new conversation
app.post('/new-conversation', async (req: Request, res: Response) => {
  // Check if RAG system is initialized
  if (!ragSystem) {
    return res.status(503).json({ error: 'RAG system is still initializing. Please try again later.' });
  }
  
  try {
    await ragSystem.startNewConversation(); // Start a new conversation
    res.json({ message: 'New conversation started' });
  } catch (error) {
    const logger = Logger.getInstance();
    await logger.log('Error starting new conversation', error);
    res.status(500).json({ error: 'Failed to start a new conversation' });
  }
});

// Endpoint to retrieve document names for a specific session
app.get('/documents/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  try {
    const rows = await ragSystem?.getDocumentNames(sessionId);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve document names' });
  }
});

// Endpoint to switch conversations based on session ID
app.post('/switch-llm-model', async (req: Request, res: Response) => {
  const { modelName } = req.body;
  
  // Validate the model name
  if (modelName !== 'gemini' && modelName !== 'ollama') {
    return res.status(400).json({ error: 'Invalid model name. Use "gemini" or "ollama".' });
  }

  try {
    await ragSystem?.switchModel(modelName); // Switch the model based on the request
    res.json({ message: `Switched to model: ${modelName}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to switch model' });
  }
});


const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.array('files'), async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  try {
    const documentPaths = files.map(file => file.path);
    const documents = await loadDocuments(documentPaths);
    
    await ragSystem?.saveDocuments(documents, req.sessionID);
    res.json({ message: 'Files uploaded and processed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

app.post('/llm-api-key', async (req: Request, res: Response) => {
  const { keyName, apiKey } = req.body;
  try {
    await ragSystem?.addLLMApiKey(keyName, apiKey);
    res.json({ message: 'LLM API key added' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add LLM API key' });
  }
});

app.post('/switch-llm-model', async (req: Request, res: Response) => {
  const { modelName } = req.body;
  try {
    await ragSystem?.switchModel(modelName);
    res.json({ message: `Switched to model: ${modelName}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to switch model' });
  }
});


// Start the Express server
app.listen(port, () => {
  console.log(`RAG system server running at http://localhost:${port}`);
});