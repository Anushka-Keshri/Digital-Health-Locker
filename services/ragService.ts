import Fuse from 'fuse.js';

interface MedicalIndex {
    medicines: string[];
    dictionary: string[];
    knowledge: Record<string, { uses: string[]; sideEffects: string[] }>;
}

class RAGService {
    private index: MedicalIndex | null = null;
    private medicineSet: Set<string> = new Set();
    private dictionarySet: Set<string> = new Set();
    private genericsList: string[] = [];
    private dictionaryFuse: Fuse<string> | null = null;
    private isLoading = false;

    async init() {
        if (this.index || this.isLoading) return;
        this.isLoading = true;
        console.log('RAG: Initializing index (Optimized)...');
        try {
            const response = await fetch('/data/medical_index.json');
            this.index = await response.json();

            if (this.index) {
                // Use Sets for O(1) exact lookups - much faster than Fuse on 250k items
                this.medicineSet = new Set(this.index.medicines.map(m => m.toLowerCase()));
                this.dictionarySet = new Set(this.index.dictionary.map(d => d.toLowerCase()));
                this.genericsList = Object.keys(this.index.knowledge);

                // Only initialize Fuse for the smaller dictionary (16k) to avoid freezing
                this.dictionaryFuse = new Fuse(this.index.dictionary, {
                    threshold: 0.3,
                });
            }
            console.log('RAG: Optimized Index loaded successfully');
        } catch (error) {
            console.error('RAG: Failed to load index', error);
        } finally {
            this.isLoading = false;
        }
    }

    correctTerm(term: string): { corrected: string; original: string; type: 'MEDICINE' | 'DICTIONARY' | 'NONE' } {
        if (!this.index) return { corrected: term, original: term, type: 'NONE' };

        const lowerTerm = term.toLowerCase();

        // 1. Direct match (O(1) - Instant)
        if (this.medicineSet.has(lowerTerm)) {
            return { corrected: term, original: term, type: 'MEDICINE' };
        }
        if (this.dictionarySet.has(lowerTerm)) {
            return { corrected: term, original: term, type: 'DICTIONARY' };
        }

        // 2. Fuzzy search dictionary (Smaller list, less likely to freeze)
        // We skip fuzzy on the 250k medicine list because it's too slow for UI thread
        const dictResults = this.dictionaryFuse?.search(lowerTerm);
        if (dictResults && dictResults.length > 0 && dictResults[0].score! < 0.25) {
            return { corrected: this.toTitleCase(dictResults[0].item), original: term, type: 'DICTIONARY' };
        }

        return { corrected: term, original: term, type: 'NONE' };
    }

    getKnowledge(term: string): string {
        if (!this.index) return "";
        const lowerTerm = term.toLowerCase();

        let context = "";
        // Optimize: Only check generics mentioned in the term
        // This is much faster than looping through all generics for every tiny word
        for (const generic of this.genericsList) {
            if (lowerTerm.includes(generic)) {
                const info = this.index.knowledge[generic];
                context += `\n- **${this.toTitleCase(generic)}**: Used for ${info.uses.join(', ')}. Side effects include ${info.sideEffects.join(', ')}.`;
            }
        }
        return context;
    }

    private toTitleCase(str: string) {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }
}

export const ragService = new RAGService();
