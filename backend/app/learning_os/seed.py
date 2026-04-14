from __future__ import annotations

SEED_TOPICS = [
    {
        "id": "math-algebra-patterns",
        "title": "Algebraic Patterns",
        "domain": "Mathematics",
        "description": "Use variables, ratios, and patterns to model change in real situations.",
        "difficulty": "foundation",
        "estimated_minutes": 40,
        "tags": ["algebra", "patterns", "equations"],
        "prerequisites": [],
        "lesson_summary": (
            "Algebra turns repeating numerical behavior into compact expressions. "
            "Learners spot patterns, define variables, and test whether a rule fits new cases."
        ),
        "concepts": [
            "Variables represent changing quantities.",
            "Expressions compress repeated arithmetic structure.",
            "Patterns can be generalized into algebraic rules.",
        ],
        "quiz_bank": [
            {
                "prompt": "If the pattern adds 4 each step and starts at 3, what is the 5th term?",
                "type": "mcq",
                "options": ["15", "19", "23", "27"],
                "answer": "19",
                "explanation": "The terms are 3, 7, 11, 15, 19.",
            },
            {
                "prompt": "Write an expression for 'three more than twice a number n'.",
                "type": "short_answer",
                "answer_keywords": ["2n+3", "2*n+3", "twice", "three more"],
                "ideal_answer": "2n + 3",
                "explanation": "Twice a number is 2n; three more gives 2n + 3.",
            },
            {
                "prompt": "Which statement best explains why variables are useful?",
                "type": "mcq",
                "options": [
                    "They remove the need for numbers.",
                    "They let one rule represent many cases.",
                    "They always make equations easier.",
                    "They are only used in geometry.",
                ],
                "answer": "They let one rule represent many cases.",
                "explanation": "A variable stands for many possible values, so one model can fit many examples.",
            },
        ],
        "retrieval_notes": [
            "Pattern work improves when students verbalize how the step-to-step change behaves.",
            "Common misconception: learners confuse the next-step increase with the term number.",
        ],
    },
    {
        "id": "science-forces-motion",
        "title": "Forces and Motion",
        "domain": "Science",
        "description": "Explain how pushes, pulls, mass, and friction influence motion.",
        "difficulty": "foundation",
        "estimated_minutes": 45,
        "tags": ["physics", "motion", "forces"],
        "prerequisites": [],
        "lesson_summary": (
            "Motion changes when balanced forces become unbalanced. "
            "Students connect force diagrams to acceleration, direction, and friction."
        ),
        "concepts": [
            "Balanced forces do not change motion.",
            "Unbalanced forces cause acceleration.",
            "Friction opposes motion and converts kinetic energy into heat.",
        ],
        "quiz_bank": [
            {
                "prompt": "What happens when the net force on an object is zero?",
                "type": "mcq",
                "options": [
                    "It must speed up.",
                    "Its motion stays the same.",
                    "It always stops.",
                    "It changes direction instantly.",
                ],
                "answer": "Its motion stays the same.",
                "explanation": "Zero net force means no acceleration, so velocity is unchanged.",
            },
            {
                "prompt": "Why does friction matter when a box slides across the floor?",
                "type": "short_answer",
                "answer_keywords": ["opposes", "motion", "slows", "heat", "surface"],
                "ideal_answer": "Friction opposes the motion, slows the box, and transfers some energy into heat.",
                "explanation": "Friction acts opposite the movement and changes how fast an object travels.",
            },
            {
                "prompt": "Which force pair is balanced?",
                "type": "mcq",
                "options": [
                    "10 N left and 4 N right",
                    "6 N up and 6 N down",
                    "2 N forward and 7 N forward",
                    "5 N down and 2 N up",
                ],
                "answer": "6 N up and 6 N down",
                "explanation": "Balanced forces are equal in size and opposite in direction.",
            },
        ],
        "retrieval_notes": [
            "Link every motion explanation to net force, not just one named force.",
            "Learners often think motion itself requires a constant force.",
        ],
    },
    {
        "id": "cs-algorithmic-thinking",
        "title": "Algorithmic Thinking",
        "domain": "Computer Science",
        "description": "Break problems into steps, spot patterns, and design efficient procedures.",
        "difficulty": "intermediate",
        "estimated_minutes": 50,
        "tags": ["algorithms", "decomposition", "logic"],
        "prerequisites": ["math-algebra-patterns"],
        "lesson_summary": (
            "Algorithmic thinking translates messy problems into repeatable steps. "
            "Students decompose tasks, reason about inputs and outputs, and compare solution efficiency."
        ),
        "concepts": [
            "Decomposition splits complex tasks into manageable parts.",
            "Algorithms need clear inputs, steps, and outputs.",
            "Efficiency matters when multiple solutions are correct.",
        ],
        "quiz_bank": [
            {
                "prompt": "What is the main goal of decomposition?",
                "type": "mcq",
                "options": [
                    "To avoid writing algorithms",
                    "To split a problem into smaller parts",
                    "To make every step identical",
                    "To remove the need for testing",
                ],
                "answer": "To split a problem into smaller parts",
                "explanation": "Decomposition reduces complexity by isolating manageable subproblems.",
            },
            {
                "prompt": "Explain why two correct algorithms might not be equally good.",
                "type": "short_answer",
                "answer_keywords": ["efficient", "time", "steps", "resources", "faster"],
                "ideal_answer": "Both can be correct, but one may use fewer steps or less time and resources.",
                "explanation": "Correctness matters first, then efficiency and maintainability determine which approach is stronger.",
            },
            {
                "prompt": "Which description best matches an algorithm?",
                "type": "mcq",
                "options": [
                    "A random guess that sometimes works",
                    "A fixed sequence of steps to solve a problem",
                    "A programming language",
                    "A hardware component",
                ],
                "answer": "A fixed sequence of steps to solve a problem",
                "explanation": "Algorithms are step-by-step procedures for transforming inputs into outputs.",
            },
        ],
        "retrieval_notes": [
            "Ask learners to explain each step verbally to reveal missing assumptions.",
            "Efficiency conversations should stay concrete: time, memory, readability.",
        ],
    },
    {
        "id": "writing-argument-structure",
        "title": "Argument Structure",
        "domain": "Communication",
        "description": "Build clear claims, evidence, and reasoning in written responses.",
        "difficulty": "foundation",
        "estimated_minutes": 35,
        "tags": ["writing", "argument", "evidence"],
        "prerequisites": [],
        "lesson_summary": (
            "Strong arguments connect a clear claim to relevant evidence and explicit reasoning. "
            "Learners move from opinion statements to defensible explanations."
        ),
        "concepts": [
            "A claim states what you want the reader to accept.",
            "Evidence supports the claim with facts, examples, or data.",
            "Reasoning explains why the evidence proves the claim.",
        ],
        "quiz_bank": [
            {
                "prompt": "Which part of an argument explains how the evidence supports the claim?",
                "type": "mcq",
                "options": ["Reasoning", "Hook", "Caption", "Summary"],
                "answer": "Reasoning",
                "explanation": "Reasoning is the bridge between the evidence and the claim.",
            },
            {
                "prompt": "Write one sentence that distinguishes a claim from evidence.",
                "type": "short_answer",
                "answer_keywords": ["claim", "evidence", "states", "supports", "proof"],
                "ideal_answer": "A claim states the position, while evidence provides proof that supports it.",
                "explanation": "Claims tell us what to believe; evidence helps justify that belief.",
            },
            {
                "prompt": "Which example is best described as evidence?",
                "type": "mcq",
                "options": [
                    "School lunch should be healthier.",
                    "A survey showed 72% of students want more fruit options.",
                    "I strongly believe this change matters.",
                    "The conclusion repeats the main idea.",
                ],
                "answer": "A survey showed 72% of students want more fruit options.",
                "explanation": "Specific data is evidence because it supports the claim.",
            },
        ],
        "retrieval_notes": [
            "Students often provide evidence without explaining why it matters.",
            "Argument practice improves when feedback separately scores claim, evidence, and reasoning.",
        ],
    },
]


SEED_LIBRARY_DOCUMENTS = [
    {
        "title": "Productive Study Loops",
        "source_type": "system",
        "content": (
            "The most reliable study loop is plan, learn, test, analyze, adapt, repeat. "
            "Plan by choosing one priority topic. Learn by engaging with examples. "
            "Test immediately with recall or a short quiz. Analyze errors for patterns. "
            "Adapt the next session by reducing scope, increasing scaffolds, or changing explanation style."
        ),
    },
    {
        "title": "Retrieval Practice Guide",
        "source_type": "system",
        "content": (
            "Retrieval practice strengthens memory when learners attempt recall before reviewing notes. "
            "Short quizzes, flash prompts, and explain-it-back summaries expose weak spots faster than passive rereading."
        ),
    },
]
