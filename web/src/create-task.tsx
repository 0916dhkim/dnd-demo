import { useState, FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface newTodo {
  title: string;
}
const Create_task = () => {
  const [userInput, setUserInput] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newTodo: newTodo) => {
      return fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/create`, {
        body: JSON.stringify(newTodo),
        method: "POST",
        headers: { "content-type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e) => {
      console.log(e);
    },
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate({ title: userInput });
  };
  return (
    <form onSubmit={onSubmit}>
      <input
        type="text"
        value={userInput}
        onChange={(e) => {
          setUserInput(e.target.value);
        }}
      />
      <button type="submit"> Submit</button>
    </form>
  );
};

export default Create_task;
