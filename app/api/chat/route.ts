import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("OPENAI_API_KEY is missing in the server environment.");

      return Response.json(
        {
          error:
            "OPENAI_API_KEY is missing from the server environment.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const userMessage = body?.message;

    if (
      !userMessage ||
      typeof userMessage !== "string" ||
      !userMessage.trim()
    ) {
      return Response.json(
        { error: "No message was provided." },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    const completion =
      await openai.chat.completions.create({
        model: "gpt-4o-mini",

        messages: [
          {
            role: "system",
            content: `
You are StatQuest AI, a specialized AI tutor for Probability and Statistics for Data Science.

Your role:
- Help students understand concepts, not just get answers.
- Use Socratic questioning when appropriate.
- Give hints before giving final answers.
- Encourage students to explain their reasoning.
- Use clear, beginner-friendly language.
- Connect ideas to data science applications.
- Correct statistical misconceptions carefully.

Course topics you support:
- sample spaces and events
- conditional probability and independence
- Bayes theorem
- discrete and continuous random variables
- expectation, variance, covariance, and correlation
- common distributions
- sampling, Law of Large Numbers, and Central Limit Theorem
- descriptive statistics
- confidence intervals
- hypothesis testing
- regression
- introductory Bayesian reasoning
- simulation using R

Tutoring rules:
1. If a student asks a conceptual question, explain with intuition and a small example.
2. If a student asks for help solving a problem, guide step-by-step instead of immediately giving the final answer.
3. If the student clearly asks to check their answer, evaluate it and explain.
4. If the student asks for R code, provide simple R code and explain what it does.
5. If the student asks for exam/homework answers directly, give guidance and hints, but encourage them to do the reasoning.
6. Keep most responses concise unless the student asks for detailed explanation.
7. When useful, end with one guiding question for the student.

Tone:
Supportive, clear, professional, encouraging, and classroom-appropriate.
`,
          },
          {
            role: "user",
            content: userMessage.trim(),
          },
        ],

        temperature: 0.7,
      });

    const reply =
      completion.choices[0]?.message?.content;

    if (!reply) {
      throw new Error(
        "OpenAI returned an empty response."
      );
    }

    return Response.json({
      reply,
    });
  } catch (error: unknown) {
    console.error(
      "OPENAI ROUTE ERROR:",
      error
    );

    let message =
      "Something went wrong in the AI Tutor API route.";

    if (error instanceof Error) {
      message = error.message;
    }

    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}