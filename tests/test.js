import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';
import { spawn } from 'child_process';
import { createInterface } from 'readline';

// Obtenir le répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Couleurs pour l'affichage console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Exécuter un fichier de test en tant que processus séparé et collecter sa sortie
 * @param {string} testFile - Le nom du fichier à exécuter
 * @returns {Promise<{success: boolean, output: string, duration: number}>} - Résultat du test
 */
async function runTestFile(testFile) {
  return new Promise((resolve) => {
    const start = Date.now();
    const testPath = join(__dirname, testFile);
    const testProcess = spawn('node', [testPath], { 
      stdio: ['ignore', 'pipe', 'pipe'] 
    });
    
    let output = '';
    const stdout = createInterface({ input: testProcess.stdout });
    const stderr = createInterface({ input: testProcess.stderr });
    
    stdout.on('line', (line) => {
      output += line + '\n';
    });
    
    stderr.on('line', (line) => {
      output += line + '\n';
    });
    
    testProcess.on('close', (code) => {
      const duration = Date.now() - start;
      resolve({
        success: code === 0,
        output,
        duration
      });
    });
  });
}

/**
 * Fonction principale pour exécuter tous les tests
 */
async function runAllTests() {
  try {
    console.log(`${colors.cyan}=== SecMyMail Test Runner ===${colors.reset}\n`);
    
    // Trouver tous les fichiers de test
    const files = await readdir(__dirname);
    const testFiles = files.filter(file => 
      file.endsWith('Test.js') && 
      file !== 'test.js'
    );
    
    console.log(`Found ${testFiles.length} test files to run:`);
    testFiles.forEach(file => console.log(`  - ${file}`));
    console.log();
    
    // Suivre les résultats
    let passed = 0;
    let failed = 0;
    const failedTests = [];
    
    // Exécuter chaque test
    for (const testFile of testFiles) {
      process.stdout.write(`Running: ${testFile}\n`);
      
      const result = await runTestFile(testFile);
      
      if (result.success) {
        process.stdout.write(`${colors.green}✓ Passed${colors.reset} (${result.duration}ms)\n\n`);
        passed++;
      } else {
        process.stdout.write(`${colors.red}✗ Failed${colors.reset} (${result.duration}ms)\n`);
        // Afficher uniquement les messages d'erreur, en filtrant la sortie normale des tests
        const errorLines = result.output
          .split('\n')
          .filter(line => line.includes('Error:') || line.includes('at ') || line.startsWith('['));
        
        // Regrouper les messages d'erreur logiquement et éviter une sortie excessive
        let lastErrorLine = '';
        errorLines.forEach(line => {
          // Ignorer les messages d'erreur en double qui apparaissent souvent dans les traces de pile
          if (!lastErrorLine.includes(line) && !line.includes('node:internal')) {
            process.stdout.write(`${line}\n`);
            lastErrorLine = line;
          }
        });
        
        console.log();
        failed++;
        failedTests.push(testFile);
      }
    }
    
    // Afficher le résumé
    console.log(`${colors.cyan}=== Test Summary ===${colors.reset}`);
    console.log(`Total tests: ${testFiles.length}`);
    console.log(`Passed: ${colors.green}${passed}${colors.reset}`);
    console.log(`Failed: ${colors.red}${failed}${colors.reset}`);
    
    if (failed > 0) {
      console.log(`\nFailed tests:`);
      failedTests.forEach(test => console.log(`  - ${test}`));
    }
    
    // Quitter avec le code approprié
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error(`${colors.red}Error running tests:${colors.reset}`, error);
    process.exit(1);
  }
}

runAllTests();