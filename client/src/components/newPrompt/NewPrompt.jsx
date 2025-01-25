import { useEffect, useRef, useState } from "react";
import "./newPrompt.css";
import Upload from "../upload/Upload";
import ChatResponse from "../chatResponse/ChatResponse";
import { IKImage } from "imagekitio-react";
import model from "../../lib/gemini";
// import ReactMarkdown from "react-markdown";
// import Markdown from "react-markdown";
import remarkGfm from 'remark-gfm'
import { useMutation, useQueryClient } from "@tanstack/react-query";


const NewPrompt = ({ data }) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [img, setImg] = useState({
    isLoading: false,
    error: "",
    dbData: {},
    aiData: {},
  });

  const img2 = {
    "dbData" : {},
    "aiData" : {},
  }

  // const chat = model.startChat({
  //   history: data?.history?.map(({ role, parts }) => {
  //     if (role && parts?.[0]?.text) {
  //       return {
  //         role,
  //         parts: [{ text: parts[0].text }],
  //       };
  //     }
  //     return null; // Skip invalid entries
  //   }).filter(Boolean), // Remove invalid entries
  //   generationConfig: {
  //     // maxOutputTokens: 100,
  //   },
  // });

  const endRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [data, question, answer, img.dbData]);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      return fetch(`${import.meta.env.VITE_API_URL}/api/chats/${data._id}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ["chat", data._id] })
        .then(() => {
          formRef.current.reset();
          setAnswer("");
          setImg({
            isLoading: false,
            error: "",
            dbData: {},
            aiData: {},
          });
        });
    },
    onError: (err) => {
      console.log(err);
    },
  });

  // const add = async (text, isInitial) => {
  //   if (!isInitial) setQuestion(text);
  //   console.log(chat)
  //   try {
  //     const result = await chat.sendMessageStream(
  //       Object.entries(img.aiData).length ? [img.aiData, text] : [text]
  //     );
  //     let accumulatedText = "";
  //     for await (const chunk of result.stream) {
  //       const chunkText = chunk.text();
  //       console.log(chunkText);
  //       accumulatedText += chunkText;
  //       setAnswer(accumulatedText);
  //     }

  //     mutation.mutate();
  //   } catch (err) {
  //     console.log(err);
  //   }
  // };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
    
  //   const text = e.target.text.value;
  //   if (!text) return;

  //   add(text, false);
  // };

  const add = async (text, isInitial) => {
      if (!isInitial) setQuestion(text);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chats/${data._id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: text.length ? text : undefined,
          imgdb: img2["dbData"]?.filePath || undefined,
          imgai: img2["aiData"] || undefined,
        }),
      });

      let accumulatedData = "";

      if (!response.ok) {
        // Handle error (e.g., display an error message)
        return; 
      }
      
      if(response.ok){
        const reader = response.body.getReader();

        const read = async () => {
          try {
            const { done, value } = await reader.read();
            if (done) {
              reader.releaseLock();
              setAnswer(accumulatedData)
              return; 
            }
            const decoder = new TextDecoder();
            const chunk = decoder.decode(value);
            accumulatedData += chunk
            setAnswer((prevAnswer) => prevAnswer + chunk);
            read(); 
          }catch (error) {
            console.error("Error reading stream:", error);
            reader.releaseLock(); 
          } 
        };
        read(); 
      };
  mutation.mutate();
};
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const text = e.target.text.value;
    if (!text) return;

    img2["dbData"]= img.dbData;
    img2["aiData"]= [img.aiData];
    // setQuestion(text);

    // console.log(text);
    // console.log(img);
    // console.log(img2["aiData"]);

    // fetch(`${import.meta.env.VITE_API_URL}/api/chats/${data._id}`, {
    //   method: "PUT",
    //   credentials: "include",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     question: text.length ? text : undefined,
    //     imgdb: img2["dbData"]?.filePath || undefined,
    //     imgai: img2["aiData"] || undefined,
    //   }),
    // }).then((res) => res.json());

    add(text, false);
  };


  // IN PRODUCTION WE DON'T NEED IT
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current) {
      if (data?.history?.length === 1) {
        add(data.history[0].parts[0].text, true);
      }
    }
    hasRun.current = true;
  }, []);

  return (
    <>
      {/* ADD NEW CHAT */}
      {img.isLoading && <div className="">Loading...</div>}
      {img.dbData?.filePath && (
        <IKImage
          urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
          path={img.dbData?.filePath}
          width="380"
          transformation={[{ width: 380 }]}
        />
      )}
      {question && <div className="message user">{question}</div>}
      {answer && (
        <div className="message">
          <ChatResponse answer={answer}/>
        </div>
      )}
      <div className="endChat" ref={endRef}></div>
      <form className="newForm" onSubmit={handleSubmit} ref={formRef}>
        <Upload setImg={setImg} />
        <input id="file" type="file" multiple={false} hidden />
        <input type="text" name="text" placeholder="Ask anything..." />
        <button>
          <img src="/arrow.png" alt="" />
        </button>
      </form>
    </>
  );
};

export default NewPrompt;
