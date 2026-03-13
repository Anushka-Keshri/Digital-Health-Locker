import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Manual env parsing
const envPath = path.resolve(process.cwd(), ".env.local");
let apiKey = process.env.GROQ_API_KEY;

if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const match = content.match(/GROQ_API_KEY=(.+)/);
    if (match) {
        apiKey = match[1].trim();
    }
}

if (!apiKey) {
    console.error("API Key not found!");
    process.exit(1);
}

const groq = new Groq({ apiKey });

async function main() {
    try {
        const list = groq.models.list();
        // It's an async iterable?
        console.log("Is async iterable?", Symbol.asyncIterator in list);

        let count = 0;
        for await (const model of list) {
            console.log(model.id);
            count++;
        }
        console.log("Total iterated:", count);

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

main();
