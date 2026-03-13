import Groq from "groq-sdk";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function main() {
    const models = await groq.models.list();
    console.log("Available Models:");
    models.data.forEach((m) => {
        console.log(`- ${m.id}`);
    });
}

main().catch(console.error);
