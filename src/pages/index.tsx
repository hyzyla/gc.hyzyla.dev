import { signIn, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";

import { api } from "~/utils/api";

export default function Home() {
  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <AuthShowcase />
    </>
  );
}

function AuthShowcase() {
  const [selectedRepositoriesId, setSelectedRepository] = useState<Set<string>>(
    new Set(),
  );

  const { data: sessionData } = useSession();

  const { data, refetch: refetchRepositories } =
    api.repository.getRepositories.useQuery(
      undefined, // no input
      { enabled: sessionData?.user !== undefined },
    );
  const {
    mutateAsync: deleteRepository,
    isLoading,
    isError,
    error,
  } = api.repository.deleteRepository.useMutation();

  const onSelectRepository = (repositoryId: string) => {
    setSelectedRepository((selected) => {
      if (selected.has(repositoryId)) {
        selected.delete(repositoryId);
        return selected;
      }
      selected.add(repositoryId);
      return selected;
    });
  };

  const onDeleteSelectedRepository = async () => {
    const selectedProjects = data?.viewer.repositories.nodes.filter((node) =>
      selectedRepositoriesId.has(node.id),
    );

    if (!selectedProjects) return;

    for (const project of selectedProjects) {
      await deleteRepository({
        repository: project.name,
        owner: project.owner.login,
      });
      await refetchRepositories();
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center py-2">
      <Card className="max-w-[550px]">
        <CardHeader>
          <CardTitle>Github Cleaner 🧹</CardTitle>
          <CardDescription>Remove your Github projects in bulk</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionData && <span>Logged in as {sessionData.user?.name}</span>}
          {data && (
            <div className="">
              {data.viewer.repositories.nodes
                .filter((node) => node.isFork)
                .map((node) => (
                  <div
                    className="flex flex-row border-b border-gray-200 py-3"
                    key={node.id}
                  >
                    <div className="flex flex-1 flex-col space-y-1  border-gray-200 pr-3">
                      <Link href={node.url} className="text-sm font-medium">
                        {node.name}{" "}
                      </Link>
                      {node.description ? (
                        <p className="text-muted-foreground text-sm">
                          {node.description}
                        </p>
                      ) : (
                        <p className="text-muted-empty truncate text-sm">
                          No description
                        </p>
                      )}
                    </div>
                    <div className="flex w-10 flex-col items-center justify-center sm:w-12">
                      <Checkbox
                        id={`${node.id}-checkbox`}
                        onClick={() => onSelectRepository(node.id)}
                      />
                      <label
                        htmlFor={`${node.id}-checkbox`}
                        className="absolute h-12 w-10 sm:w-12"
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
          <div className="flex flex-row justify-end space-x-2">
            <Button
              onClick={sessionData ? () => void signOut() : () => void signIn()}
            >
              {sessionData ? "Sign out" : "Sign in"}
            </Button>
            <Button onClick={onDeleteSelectedRepository}>
              Delete selected
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // return (
  //   <>

  //   </>
  // );
}
