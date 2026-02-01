import { texts, getText } from './@generated/text-types';

// 1. Render raw JSON content
const jsonOutput = document.getElementById('json-output');
if (jsonOutput) {
  jsonOutput.textContent = JSON.stringify(texts, null, 2);
}

// 2. Demonstrate getText with parameters
const helloOutput = document.querySelector('#hello-output > pre') as HTMLPreElement;
helloOutput.textContent = getText('hello.md', { name: 'John' });
