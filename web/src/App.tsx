import "./App.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { List } from "./list";

import Form from "./create-task";

const queryClient = new QueryClient();

function App() {
  // const [count, setCount] = useState(0);

  return (
    <QueryClientProvider client={queryClient}>
      <List />
      <Form />
    </QueryClientProvider>
  );
}

export default App;
