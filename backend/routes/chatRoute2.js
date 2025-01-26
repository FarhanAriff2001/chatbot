import express from "express";
import Chat from '../models/Chat.js'; // Get Chat model
import UserChats from "../models/UserChats.js";

import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
const chatRoute2 = express.Router();
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  SchemaType,
} from "@google/generative-ai";

const safetySetting = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
];

const model_chat_answer = async (data, modelChosen, text, imgai, res) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_PUBLIC_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySetting,
    });
    // console.log(data)
    const chat = model.startChat({
      history: data?.history?.map(({ role, parts }) => {
        if (role && parts?.[0]?.text) {
          return {
            role,
            parts: [{ text: parts[0].text }],
          };
        }
        return null; // Skip invalid entries
      }).filter(Boolean), // Remove invalid entries
      generationConfig: {
        // maxOutputTokens: 100,
      },
    });
    // console.log("CHAT CREATED")
    let accumulatedText = "";
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    try {
      const result = await chat.sendMessageStream(
        [text]
      );
      // console.log("WAITING FOR RESULT")
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        // console.log(chunkText)
        accumulatedText += chunkText;
        console.log(chunkText)
        res.write(`${chunkText}`); // Send chunk to client
      }
    } catch (err) {
      console.log(err);
    }
    return accumulatedText;
  } catch (error) {
    console.error("Error creating model:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

chatRoute2.put("/:id", async (req, res) => {
  const { userId, question, imgai, imgdb } = req.body;
  console.log("Update New Question : ", question)
  const data = await Chat.findOne({ _id: req.params.id, userId });
  const answer = await model_chat_answer(data, "gemini-1.5-flash", question, imgai, res);
  console.log("PUT ANSWER", answer)
  const newItems = [
    ...(question
      ? [{ role: "user", parts: [{ text: question }], ...(imgdb && { imgdb }) }]
      : []),
    { role: "model", parts: [{ text: answer }] },
  ];

  try {

    if (data.history.length === 1) {
      const updatedChat = await Chat.updateOne(
        { _id: req.params.id, userId },
        {
          $push: {
            history: { role: "model", parts: [{ text: answer }] },
          },
        }
      );
    }
    else {
      const updatedChat = await Chat.updateOne(
        { _id: req.params.id, userId },
        {
          $push: {
            history: {
              $each: newItems,
            },
          },
        }
      );
    }
    console.log("UPDATED CHAT")
    // res.status(200).send(updatedChat);
    res.end()
  } catch (err) {
    console.log(err);
    res.status(500).send("Error adding conversation!");
  }
});

chatRoute2.post("/", async (req, res) => {
  console.log("CREATING CHAT")
  const { userId, text } = req.body;
  try {
    // CREATE A NEW CHAT
    const newChat = new Chat({
      userId: userId,
      history: [{ role: "user", parts: [{ text }] }],
    });

    const savedChat = await newChat.save();

    // CHECK IF THE USERCHATS EXISTS
    const userChats = await UserChats.find({ userId: userId });

    // IF DOESN'T EXIST CREATE A NEW ONE AND ADD THE CHAT IN THE CHATS ARRAY
    if (!userChats.length) {
      const newUserChats = new UserChats({
        userId: userId,
        chats: [
          {
            _id: savedChat._id,
            title: text.substring(0, 40),
          },
        ],
      });

      await newUserChats.save();
    } else {
      // IF EXISTS, PUSH THE CHAT TO THE EXISTING ARRAY
      await UserChats.updateOne(
        { userId: userId },
        {
          $push: {
            chats: {
              _id: savedChat._id,
              title: text.substring(0, 40),
            },
          },
        }
      );

      res.status(201).send(newChat._id);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Error creating chat!");
  }
});

// const model_answer = async (modelChosen, text, imgai, res) => {
//   try {
//     const genAI = new GoogleGenerativeAI(process.env.GEMINI_PUBLIC_KEY);
//     const model = genAI.getGenerativeModel({
//       model: "gemini-1.5-flash",
//       safetySetting,
//     });
//     let accumulatedText = "";
//     res.writeHead(200, {
//       'Content-Type': 'text/event-stream',
//       'Cache-Control': 'no-cache',
//       'Connection': 'keep-alive'
//     });
//     try {
//       const result = await model.generateContentStream(text);
//       for await (const chunk of result.stream) {
//         const chunkText = chunk.text();
//         console.log(chunkText)
//         accumulatedText += chunkText;
//         res.write(`${chunkText}`); // Send chunk to client
//       }

//     } catch (err) {
//       console.log(err);
//     }

//     return accumulatedText;
//   } catch (error) {
//     console.error("Error creating model:", error);
//     throw error; // Re-throw the error to be handled by the caller
//   }
// };

// chatRoute2.post("/", async (req, res) => {
//   console.log("CREATING CHAT")
//   const { userId, text } = req.body;
//   console.log(text)
//   const answer = await model_answer("gemini-1.5-flash", text, null, res);
//   console.log("POST ANSWER", answer)
//   console.log("RANDOM")
//   try {
//     // CREATE A NEW CHAT
//     const newChat = new Chat({
//       userId: userId,
//       history: [{ role: "user", parts: [{ text }] }, { role: "model", parts: [{ text: answer }] }],
//     });

//     const savedChat = await newChat.save();

//     // CHECK IF THE USERCHATS EXISTS
//     const userChats = await UserChats.find({ userId: userId });

//     // IF DOESN'T EXIST CREATE A NEW ONE AND ADD THE CHAT IN THE CHATS ARRAY
//     if (!userChats.length) {
//       const newUserChats = new UserChats({
//         userId: userId,
//         chats: [
//           {
//             _id: savedChat._id,
//             title: text.substring(0, 40),
//           },
//         ],
//       });

//       await newUserChats.save();
//     } else {
//       // IF EXISTS, PUSH THE CHAT TO THE EXISTING ARRAY
//       await UserChats.updateOne(
//         { userId: userId },
//         {
//           $push: {
//             chats: {
//               _id: savedChat._id,
//               title: text.substring(0, 40),
//             },
//           },
//         }
//       );
//     }

//     res.status(201).send(newChat._id);
//   } catch (err) {
//     console.log(err);
//     res.status(500).send("Error creating chat!");
//   }
// });

chatRoute2.get("/userchats", async (req, res) => {
  console.log("GETTING USER'S CHATS")
  const { userId } = req.body;

  try {
    const userChats = await UserChats.find({ userId });

    res.status(200).send(userChats[0].chats);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching userchats!");
  }
});

chatRoute2.get("/:id", async (req, res) => {
  console.log("GETTING CHATS")
  const userId = req.query.userId;
  // console.log(userId)
  // console.log(req.params.id)
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId });
    console.log("SENDING CHAT")
    res.status(200).send(chat);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching chat!");
  }
});

// const model_chat_answer2 = async (data,modelChosen, text, imgai,  res) => {
//   try {
//     const genAI = new GoogleGenerativeAI(process.env.GEMINI_PUBLIC_KEY);
//     const model = genAI.getGenerativeModel({
//       model: "gemini-1.5-flash",
//       safetySetting,
//       generationConfig : {
//         response_mime_type : "application/json",
//         response_schema : SchemaType.OBJECT,
//       },
//     });
//     // console.log(data)
//     const chat = model.startChat({
//       history: data?.history?.map(({ role, parts }) => {
//         if (role && parts?.[0]?.text) {
//           return {
//             role,
//             parts: [{ text: parts[0].text }],
//           };
//         }
//         return null; // Skip invalid entries
//       }).filter(Boolean), // Remove invalid entries
//       generationConfig: {
//         // maxOutputTokens: 100,
//       },
//     });
//     // let accumulatedText = "";

//     try{
//       const result = await chat.sendMessage(
//         [text]
//       );
//       return result;
//      } catch (err) {
//       console.log(err);
//     }
//     return "ERROR";
//   } catch (error) {
//     console.error("Error creating model:", error);
//     throw error; // Re-throw the error to be handled by the caller
//   }
// };

export default chatRoute2;