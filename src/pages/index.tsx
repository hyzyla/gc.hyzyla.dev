import { signIn, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Progress } from "~/components/ui/progress";
import { AnimatePresence, motion } from "framer-motion";

import { type RouterOutputs, api } from "~/utils/api";

type GetRepositoryData = RouterOutputs["repository"]["getRepositories"];
type Repository = GetRepositoryData["viewer"]["repositories"]["nodes"][number];

export default function Page() {
  return (
    <>
      <MainScreen />
    </>
  );
}

function MainScreen() {
  const { data: sessionData } = useSession();
  const user = sessionData?.user;

  const getIntegrationQuery = api.repository.isIntegrationInstalled.useQuery(
    undefined,
    {
      enabled: user !== undefined,
    },
  );

  const getRepositoriesQuery = api.repository.getRepositories.useQuery(
    undefined,
    {
      enabled: user !== undefined && getIntegrationQuery.isSuccess,
    },
  );

  // ask user to login
  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col space-y-6 pt-10 text-sm">
          <p>
            You need to sign in to your Github account to use this application:
          </p>
          <div className="flex flex-row justify-end">
            <Button className="max-w-32 w-32" onClick={() => void signIn()}>
              Sign in
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // ask user to install integration
  if (!getIntegrationQuery.data) {
    return (
      <Layout>
        <IntegrationScreen
          isLoading={getIntegrationQuery.isLoading}
          isError={getIntegrationQuery.isError}
          data={getIntegrationQuery.data}
        />
      </Layout>
    );
  }

  // show repositories
  return (
    <Layout>
      <RepositoriesScreen
        user={user}
        isLoading={getRepositoriesQuery.isLoading}
        isError={getRepositoriesQuery.isError}
        data={getRepositoriesQuery.data}
        refresh={getRepositoriesQuery.refetch}
      />
    </Layout>
  );
}

function IntegrationScreen(props: {
  isLoading: boolean;
  isError: boolean;
  data: boolean | undefined;
}) {
  if (props.isLoading) {
    return (
      <p className="py-10 text-sm text-muted-foreground">
        Checking if Github integration is installed...
      </p>
    );
  }
  if (props.isError) {
    return <p className="py-10 text-sm text-muted-foreground">Errror</p>;
  }

  return (
    <div className="flex flex-col space-y-2 py-10">
      <p>You need to install the Github integration first:</p>
      <Button
        onClick={() => {
          window.open(
            "https://github.com/apps/fork-cleaner/installations/new",
            "_blank",
          );
        }}
      >
        Install
      </Button>
    </div>
  );
}

function RepositoriesScreen(props: {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  isLoading: boolean;
  isError: boolean;
  data: RouterOutputs["repository"]["getRepositories"] | undefined;
  refresh: () => void;
}) {
  const { user, isLoading, isError, data } = props;
  const [selected, setSelected] = useState<Repository[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const [showDeleteScreen, setShowDeleteScreen] = useState(false);

  if (isLoading) {
    return (
      <p className="py-10 text-sm text-muted-foreground">
        Loading repositories for{" "}
        <span className="font-medium">{user.name}</span>...
      </p>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col space-y-2">
        <p className="text-muted-empty">Error</p>
      </div>
    );
  }

  const onSelectRepository = (repository: Repository) => {
    const index = selected.findIndex((node) => node.id === repository.id);
    if (index === -1) {
      setSelected([...selected, repository]);
    } else {
      setSelected([
        ...selected.slice(0, index),
        ...selected.slice(index + 1, selected.length),
      ]);
    }
  };

  const onDeleteSelectedRepository = () => {
    setShowDeleteScreen(true);
  };

  const onDeleteDone = (deleted: Repository[]) => {
    setShowDeleteScreen(false);
    setSelected([]);
    setDeletedIds(deleted.map((repository) => repository.id));
    props.refresh();
  };

  const onClearSelectedRepository = () => {
    setSelected([]);
  };

  if (showDeleteScreen) {
    return <DeleteScreen repositories={selected} onDone={onDeleteDone} />;
  }

  const repositories = data.viewer.repositories.nodes
    .filter((repository) => repository.isFork)
    .filter((repository) => !deletedIds.includes(repository.id));

  if (repositories.length === 0) {
    return (
      <p className="py-10">
        There are no forks to delete for{" "}
        <span className="font-bold">{user.name}</span> 🎉
      </p>
    );
  }

  return (
    <div>
      <div>
        {repositories.map((repository) => (
          <RepositoryRow
            key={repository.id}
            showCheckbox={true}
            repository={repository}
            onCheckboxClick={onSelectRepository}
            isChecked={selected.includes(repository)}
          />
        ))}
      </div>
      {/* Add delete button to the footer */}
      {selected.length !== 0 && (
        <FooterTeleport>
          <div className="flex flex-row items-center justify-end gap-3">
            <Button variant="ghost" onClick={onClearSelectedRepository}>
              Clear
            </Button>
            <Button onClick={onDeleteSelectedRepository}>
              Delete ({selected.length})
            </Button>
          </div>
        </FooterTeleport>
      )}
    </div>
  );
}

function DeleteRepositoryRow(props: { repository: Repository }) {
  return (
    <motion.div
      layout={true}
      transition={{
        type: "spring",
        bounce: 0.2,
        duration: 1,
      }}
      animate={{ opacity: 1, height: "auto" }}
      initial={{ opacity: 0, height: 0 }}
    >
      <RepositoryRow repository={props.repository} />
    </motion.div>
  );
}

function DeleteScreen(props: {
  repositories: Repository[];
  onDone: (deleted: Repository[]) => void;
}) {
  const repositoriesCloned = structuredClone(props.repositories);
  const [repositories, setRepositories] = useState(repositoriesCloned);
  const [isCancelling, setIsCancelling] = useState(false);
  const cancellingRef = React.useRef(false);

  const mutation = api.repository.deleteRepository.useMutation({});

  // start deleting repositories on mount. it called twice on in development, but
  // I don't know how to fix it without enabling React strict mode
  useEffect(() => {
    const deleted: Repository[] = [];
    const process = async () => {
      for (const [index, repository] of repositories.entries()) {
        // wait 2 second before deleting the first repository
        // to give the user a chance to cancel the operation
        if (index === 0) {
          await new Promise((r) => setTimeout(r, 2 * 1000));
        }

        if (cancellingRef.current) {
          break;
        }

        try {
          await mutation.mutateAsync({
            owner: repository.owner.login,
            repository: repository.name,
          });
        } catch (error) {
        } finally {
          deleted.push(repository);
        }

        setRepositories((repositories) =>
          repositories.filter((node) => node.id !== repository.id),
        );
      }
      props.onDone(deleted);
    };
    void process();
  }, [props.repositories]);

  const onCancelClick = () => {
    cancellingRef.current = true;
    setIsCancelling(true);
  };

  // progress from 0 to 100 based on the number of repositories deleted
  // and the total number of repositories
  const progress = Math.floor(
    ((props.repositories.length - repositories.length) /
      props.repositories.length) *
      100,
  );

  return (
    <div>
      <div>
        <AnimatePresence>
          {repositories.map((node) => (
            <DeleteRepositoryRow key={node.id} repository={node} />
          ))}
        </AnimatePresence>
      </div>
      {/* Add delete button to the footer */}
      <FooterTeleport>
        <div className="flex flex-row items-center justify-end gap-3 pl-3">
          <Progress value={progress} className="animate-pulse" />
          <Button
            variant="ghost"
            onClick={onCancelClick}
            disabled={isCancelling}
          >
            {isCancelling ? "Cancelling..." : "Cancel"}
          </Button>
        </div>
      </FooterTeleport>
    </div>
  );
}

function RepositoryRow(props: {
  repository: Repository;
  showCheckbox?: boolean;
  onCheckboxClick?: (repository: Repository) => void;
  isCheckboxDisabled?: boolean;
  isChecked?: boolean;
}) {
  const { repository } = props;
  return (
    <div
      className="flex flex-row items-stretch border-b border-gray-200"
      key={repository.id}
    >
      <div className="flex flex-1 flex-col space-y-1  border-gray-200 py-3 pr-3">
        <Link href={repository.url} className="text-sm font-medium">
          {repository.name}{" "}
        </Link>
        {repository.description ? (
          <p className="text-sm text-muted-foreground">
            {repository.description}
          </p>
        ) : (
          <p className="truncate text-sm text-muted-empty">No description</p>
        )}
      </div>
      {props.showCheckbox && (
        <label
          htmlFor={`${repository.id}-checkbox`}
          className="flex w-14 cursor-pointer items-center justify-center "
        >
          <Checkbox
            id={`${repository.id}-checkbox`}
            onClick={() => props.onCheckboxClick?.(repository)}
            disabled={props.isCheckboxDisabled}
            checked={props.isChecked}
          />
        </label>
      )}
    </div>
  );
}

/**
 * This component is used to render components in the footer of the page.
 */
function FooterTeleport(props: { children: React.ReactNode }) {
  return createPortal(
    props.children,
    document.getElementById("footer-portal")!,
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { data: sessionData } = useSession();
  return (
    <div className="flex h-screen max-h-screen flex-col items-center sm:p-4">
      <Card className="grid h-full w-full max-w-xl grid-cols-[1fr] grid-rows-[100px_1fr_80px] overflow-hidden rounded-none border-0 sm:rounded-lg sm:border ">
        <CardHeader className="border-gray-200 shadow">
          <div className="flex flex-row justify-between">
            <CardTitle>Github Forks Cleaner 🧹</CardTitle>
            {sessionData && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void signOut()}
              >
                Logout
              </Button>
            )}
          </div>
          <CardDescription>
            Service that helps to remove forks from your Github account
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-y-auto">{children}</CardContent>

        <CardFooter className="shadow-top flex flex-row justify-between  border-gray-200 py-3 shadow-[0px_0px_3px_2px_rgba(0,0,1,0.1)]">
          <Button variant="link" asChild>
            <Link href="/about">About</Link>
          </Button>
          <div id="footer-portal" className="flex-1" />
        </CardFooter>
      </Card>
    </div>
  );
}
