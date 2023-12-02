import { useInfiniteQuery } from "@tanstack/react-query";

export function List() {
  const { data, fetchNextPage } = useInfiniteQuery({
    queryKey: ["tasks"],
    queryFn: async ({ pageParam }) => {
      const url = new URL(`${import.meta.env.VITE_BACKEND_URL}/api/tasks`);
      const searchParams = new URLSearchParams();
      if (pageParam) {
        searchParams.set("afterId", pageParam);
      }
      url.search = "?" + searchParams.toString();
      const response = await fetch(url);
      const body = await response.json();
      return body;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.pageInfo.hasNextPage) {
        return lastPage.pageInfo.endCursor;
      } else {
        return undefined;
      }
    },
    select: ({ pages }) => pages.flatMap((page) => page.data),
  });

  return (
    <div>
      <p>Infinite query has {data?.length ?? 0} items.</p>

      {data?.map((task) => <p key={task.id}>{task.title}</p>)}

      <button onClick={() => fetchNextPage()}>Fetch more</button>
    </div>
  );
}
