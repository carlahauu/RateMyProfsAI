"use client";
import { useState, useEffect } from "react";
import "./globals.css";
import { Box, Button, Stack, TextField } from "@mui/material";
import ReactMarkdown from "react-markdown";
import reviewsData from "../reviews.json";

export default function Home() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    setReviews(reviewsData.reviews);
  }, []);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I am the Rate My Prof support assistant. How can I help you today?",
    },
  ]);
  const [message, setMessage] = useState("");

  const sendMessage = async () => {
    setMessage("");
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);

    const response = fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = "";

      return reader.read().then(function processText({ done, value }) {
        if (done) {
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), {
          stream: true,
        });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });
        return reader.read().then(processText);
      });
    });
  };

  return (
    <div className="appContainer">
      <div className="reviewsContainer">
        <div className="professorsContainer">
          <h1 className="professors">Professors</h1>
        </div>
        {reviews.map((review, index) => (
          <div className="review">
            <h3>{review.professorName}</h3>
            <p>Subject: {review.subject}</p>
            <p>Review: {review.review}</p>
            <p>Rating: {review.starRating} ⭐</p>
          </div>
        ))}
      </div>

      <div className="chatContainer">
        <div className="messagesContainer">
          {messages.map((message, index) => (
            <div
              key={index}
              display="flex"
              justifyContent={
                message.role === "assistant" ? "flex-start" : "flex-end"
              }
            >
              <Box
                className="message"
                bgcolor={
                  message.role === "assistant"
                    ? "primary.main"
                    : "secondary.main"
                }
                borderRadius={5}
                color="white"
                p={2}
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </Box>
            </div>
          ))}
        </div>
        <div className="inputs">
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button variant="contained" onClick={sendMessage}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
