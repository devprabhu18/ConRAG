// rag\src\index.ts
import { RAGSystem } from './ragSystem';
import { loadDocuments } from './documentLoader';
import readline from 'readline';
import { Logger } from './logger';

async function main() {
  const logger = Logger.getInstance();
  await logger.log('Starting RAG system');

  try {
    const ragSystem = new RAGSystem();

    await logger.log('Loading documents');
    const documentPaths = ['./docs/doc1.txt', './docs/doc2.txt']; 
    const documentObjects = documentPaths.map(path => ({ file_path: path, metadata: { source: path } }));
    const documents = await loadDocuments(documentObjects);

    await logger.log('Initializing vector store and adding documents if necessary');
    await ragSystem.initialize(documents);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('RAG system initialized. Type your questions or "exit" to quit.');

    rl.on('line', async (input) => {
      if (input.toLowerCase() === 'exit') {
        await logger.log('Exiting RAG system');
        console.log('Exiting RAG system. Goodbye!');
        rl.close();
        return;
      } else if (input.toLowerCase() === '/new') {
        await ragSystem.startNewConversation(); // Start a new conversation
        console.log('New conversation started. Ask your question:');
        return;
      }

      await logger.log('Processing user question', { question: input });

      try {
        const result = await ragSystem.query(input);
        
        console.log('\nAnswer:', result.answer);
        
        console.log('\nSources used:');
        result.sources.forEach((source, index) => {
          console.log(`  ${index + 1}. ${source}`);
        });
      } catch (error) {
        await logger.log('Error processing question', error);
        console.error('Error occurred while processing the question:', error);
      }

      console.log('\nAsk another question or type "exit" to quit:');
    });
  } catch (error) {
    await logger.log('Error during RAG system initialization', error);
    console.error('An error occurred during RAG system initialization:', error);
  }
}

main().catch(async (error) => {
  const logger = Logger.getInstance();
  await logger.log('Unhandled error in main function', error);
  console.error('An unhandled error occurred:', error);
});
