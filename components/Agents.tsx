"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");

  const [collectedRole, setCollectedRole] = useState<string | null>(null);
  const [collectedLevel, setCollectedLevel] = useState<string | null>(null);
  const [collectedTechstack, setCollectedTechstack] = useState<string | null>(null);
  const [collectedAmount, setCollectedAmount] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
    };

    const onCallEnd = async () => {
      setCallStatus(CallStatus.FINISHED);

      if (type === "generate") {
        setIsGenerating(true);

        const tryGet = (name: string) => {
          try {
            // @ts-ignore
            const val = vapi.getVariable ? vapi.getVariable(name) : undefined;
            return val;
          } catch {
            return undefined;
          }
        };

        const role = tryGet("role") || collectedRole;
        const level = tryGet("level") || collectedLevel;
        const techstack = tryGet("techstack") || collectedTechstack;
        const amount = tryGet("amount") || collectedAmount;

        if (!role || !level || !techstack || !amount) {
          console.error("Missing collected inputs before generation:", {
            role,
            level,
            techstack,
            amount,
          });
          setIsGenerating(false);
          return;
        }

        try {
          const res = await fetch("/api/vapi/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type,
              role,
              level,
              techstack,
              amount,
              userid: userId,
            }),
          });

          const data = await res.json();
          if (res.ok && data?.id) {
            router.push(`/Interview/${data.id}`);
          } else {
            console.error("Generation failed response:", data);
            router.push("/");
          }
        } catch (err) {
          console.error("Network error while generating interview:", err);
          router.push("/");
        } finally {
          setIsGenerating(false);
        }
      } else {
        // Handle feedback creation for normal interview
        try {
          console.log("Saving feedback with:", {
            interviewId,
            userId,
            transcript: messages,
            feedbackId,
          });

          const { success, feedbackId: id } = await createFeedback({
            interviewId: interviewId!,
            userId: userId!,
            transcript: messages,
            feedbackId,
          });

          if (success && id) {
            router.push(`/Interview/${interviewId}/feedback`);
          } else {
            console.error("Error saving feedback");
            router.push("/");
          }
        } catch (err) {
          console.error("Error during feedback creation:", err);
          router.push("/");
        }
      }
    };

    const onMessage = (message: Message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        setMessages((prev) => [...prev, newMessage]);

        const txt = message.transcript.toLowerCase();

        if (
          !collectedRole &&
          (txt.includes("role") || txt.includes("position") || txt.includes("job"))
        ) {
          setCollectedRole(message.transcript);
        }

        if (
          !collectedLevel &&
          (txt.includes("experience") || txt.includes("level") || txt.includes("years"))
        ) {
          setCollectedLevel(message.transcript);
        }

        if (
          !collectedTechstack &&
          (txt.includes("tech") || txt.includes("stack") || txt.includes("technologies"))
        ) {
          setCollectedTechstack(message.transcript);
        }

        if (
          !collectedAmount &&
          (txt.match(/\b\d+\b/) || txt.includes("questions") || txt.includes("amount"))
        ) {
          const m = txt.match(/\b(\d{1,2})\b/);
          setCollectedAmount(m ? m[1] : message.transcript);
        }
      }
    };

    const onSpeechStart = () => {
      console.log("speech start");
      setIsSpeaking(true);
    };

    const onSpeechEnd = () => {
      console.log("speech end");
      setIsSpeaking(false);
    };

    const onError = (error: Error) => {
      console.log("Error:", error);
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, [
    type,
    collectedRole,
    collectedLevel,
    collectedTechstack,
    collectedAmount,
    messages,
    interviewId,
    userId,
    feedbackId,
    router,
  ]);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }
  }, [messages]);

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);
    if (type === "generate") {
      await vapi.start(
        undefined,
        undefined,
        undefined,
        process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!,
        {
          variableValues: {
            username: userName,
            userid: userId,
          },
        }
      );
    } else {
      let formattedQuestions = "";
      if (questions) {
        formattedQuestions = questions.map((q) => `- ${q}`).join("\n");
      }

      await vapi.start(interviewer, {
        variableValues: {
          questions: formattedQuestions,
        },
      });
    }
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  return (
    <>
      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="profile-image"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call" onClick={handleCall}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />
            <span className="relative">
              {callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? isGenerating
                  ? "Generating..."
                  : "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={handleDisconnect}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
