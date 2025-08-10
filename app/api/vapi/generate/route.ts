import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/Admin";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  const { type, role, level, techstack, amount, userid } = await request.json();

  try {
    const { text: questions } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
        Return the questions formatted like this:
        ["Question 1", "Question 2", "Question 3"]
        
        Thank you! <3
    `,
    });

    // Log the raw output for debugging
    console.log("Raw questions output from Gemini:", questions);

    // Parse questions safely
    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(questions);
    } catch {
      const match = questions.match(/\[([\s\S]*)\]/);
      if (match) {
        parsedQuestions = JSON.parse(match[0]);
      } else {
        throw new Error("Could not parse questions from model output");
      }
    }

    const interview = {
      role: role,
      type: type,
      level: level,
      techstack: techstack.split(","),
      questions: parsedQuestions,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("interviews").add(interview);
    console.log("Interview created in Firestore with ID:", docRef.id);

    return Response.json({ success: true, id: docRef.id }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/vapi/generate:", error);
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
