import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
You are an AI agent for a "Rate My Professor" platform designed to assist students in finding the best professors according to their queries. You will use Retrieval-Augmented Generation (RAG) to search through a database of professor reviews and ratings. For each user query, your task is to analyze the request and provide the top 3 professors who best match the student's criteria.

Instructions:

1. Understand the Query: Carefully interpret the user's query to determine what they are looking for in a professor (e.g., subject, teaching style, difficulty level, etc.).
2. Search and Retrieve: Use the RAG model to retrieve relevant information from the professor database based on the user's query.
3. Provide the Top 3 Results: Return the top 3 professors who best match the criteria provided by the student. Include the professor's name, the subject they teach, their star rating, and a brief review that highlights why they are a good fit.
4. Be Concise and Informative: Provide clear and concise responses that help the student make an informed decision.

Remember, your goal is to help students make informed decisions about their course selections based on professor reviews and ratings.
`;

export async function POST(req) {
  const data = await req.json();
  const pc = new Pinecone({
    api_key: process.env.PINECONE_API_KEY,
  });
  const index = pc.index("rag").namespace("ns1");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const text = data[data.length - 1].content;
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

  const result = await model.embedContent(text);
  const embedding = result.embedding;
  console.log(embedding.values);

  const results = await index.query({
    topK: 3,
    includeMetadata: true,
    vector: embedding.data[0].embedding,
  });

  let resultString =
    "\n\n Returned results from vector database (done automatically): ";
  results.matches.forEach((match) => {
    resultString += `\n
    Professor: ${match.id}
    Review: ${match.metadata.stars}
    Subject: ${match.metadata.subject}
    Stars ${match.metadata.stars}
    \n\n
    `;
  });
  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

  const completion = genAI
    .getGenerativeModel({ model: "gemini-1.5-flash" })
    .startChat({
      history: [
        {
          role: "system",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "user",
          parts: [{ text: lastMessageContent }],
        },
      ],
    });

  const stream = ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            const text = encoder.encode(content);
            controller.enqueue(text);
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream);
}
