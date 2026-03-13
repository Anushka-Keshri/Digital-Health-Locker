const fs = require('fs');
const readline = require('readline');
const path = require('path');

const MEDICINE_CSV = path.join(__dirname, '../data/Extensive_A_Z_medicines_dataset_of_India.csv');
const DICTIONARY_CSV = path.join(__dirname, '../data/medical_dictionary.csv');
const OUTPUT_JSON = path.join(__dirname, '../data/medical_index.json');

async function indexData() {
    console.log('Starting indexing with knowledge extraction...');
    const medicines = new Set();
    const dictionary = new Set();
    const knowledgeMap = new Map(); // Generic Name -> { uses: Set, sideEffects: Set }

    // 1. Process Medical Dictionary
    console.log('Processing dictionary...');
    const dictStream = fs.createReadStream(DICTIONARY_CSV);
    const dictLines = readline.createInterface({ input: dictStream, crlfDelay: Infinity });
    for await (const line of dictLines) {
        if (line.trim() && line !== 'wordlist') {
            dictionary.add(line.trim().toLowerCase());
        }
    }

    // 2. Process Medicine Dataset
    console.log('Processing medicines and knowledge...');
    const medStream = fs.createReadStream(MEDICINE_CSV);
    const medLines = readline.createInterface({ input: medStream, crlfDelay: Infinity });

    let isHeader = true;
    let count = 0;

    for await (const line of medLines) {
        if (isHeader) {
            isHeader = false;
            continue;
        }

        // CSV parsing is tricky with commas in quotes, but our dataset seems relatively standard
        // Splitting by comma but respecting quotes roughly:
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

        if (parts.length > 15) {
            const name = parts[1]?.replace(/"/g, '').trim();
            if (name) medicines.add(name.toLowerCase());

            const comp1Raw = parts[7]?.replace(/"/g, '').trim();
            const sideEffectsRaw = parts[14]?.replace(/"/g, '').trim();
            const uses = [parts[15], parts[16], parts[17]].map(u => u?.replace(/"/g, '').trim()).filter(u => u && u.length > 2);

            if (comp1Raw) {
                const generic = comp1Raw.split('(')[0].trim().toLowerCase();
                if (generic) {
                    if (!knowledgeMap.has(generic)) {
                        knowledgeMap.set(generic, { uses: new Set(), sideEffects: new Set() });
                    }
                    const k = knowledgeMap.get(generic);
                    uses.forEach(u => k.uses.add(u));
                    if (sideEffectsRaw) sideEffectsRaw.split(',').forEach(s => k.sideEffects.add(s.trim()));
                }
            }
        }

        count++;
        if (count % 50000 === 0) console.log(`Processed ${count} medicines...`);
    }

    console.log('Finalizing index...');

    // Convert sets to arrays for JSON
    const serializedKnowledge = {};
    for (const [key, val] of knowledgeMap.entries()) {
        serializedKnowledge[key] = {
            uses: Array.from(val.uses).slice(0, 3), // Keep top 3 to save space
            sideEffects: Array.from(val.sideEffects).slice(0, 5)
        };
    }

    const finalIndex = {
        medicines: Array.from(medicines).sort(),
        dictionary: Array.from(dictionary).sort(),
        knowledge: serializedKnowledge,
        timestamp: new Date().toISOString()
    };

    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(finalIndex));
    console.log(`Indexing complete!`);
    console.log(`- Medicines: ${finalIndex.medicines.length}`);
    console.log(`- Dictionary Terms: ${finalIndex.dictionary.length}`);
    console.log(`- Knowledge entries: ${Object.keys(finalIndex.knowledge).length}`);
    console.log(`Saved to ${OUTPUT_JSON}`);
}

indexData().catch(err => console.error(err));
