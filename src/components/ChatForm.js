import React, { useState } from "react";

const ChatForm = () => {
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    

    try {
      const response = await fetch("https://relevance-checker.onrender.com/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, abstract,year }),
      });

      
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", errorText);
      throw new Error("Failed to fetch");
    }


      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error:", error);
      setResult({ error: "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-form">
      <h2>Research Relevance Evaluator</h2>
      <form onSubmit={handleSubmit}>
        <label>Title:</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <label>Abstract (optional):</label>
        <textarea
          rows="5"
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
        />

<label>Publication Year:</label>
<input
  type="number"
  value={year}
  onChange={(e) => setYear(e.target.value)}
  placeholder="e.g. 2021"
/>


        <button type="submit" disabled={loading}>
          {loading ? "Evaluating..." : "Evaluate"}
        </button>
      </form>

      {result && (
        <div className="result">
          <h3>Relevance Assessment:</h3>
          <pre style={{ 
  whiteSpace: 'pre-wrap', 
  wordWrap: 'break-word', 
  backgroundColor: '#f4f4f4', 
  padding: '1rem',
  borderRadius: '10px',
  overflowX: 'auto'
}}>
  {JSON.stringify(result, null, 2)}
</pre>
        </div>
      )}
    </div>
  );
};

export default ChatForm;
