export default function AboutPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col gap-3 p-3">
      <div className="prose max-w-xl self-center p-2 py-16">
        <h1>About</h1>
        <p>
          This app helps to remove github forks. It shows a list of your forks
          and allows to delete them.
        </p>
        <h3>Why?</h3>
        <p>Just for fun and to practive Next.js and TailwindCSS</p>
        <h3>Source code</h3>
        <p>
          The source code of this tool is available on{" "}
          <a href="https://github.com/hyzyla/gc.hyzyla.dev" target="_blank">
            GitHub
          </a>
        </p>
        <h3>Privacy</h3>
        <p>
          Your access token and basic user information are securely in a JWT
          token. On the server side, I do not retain any data about you.
          Additionally, I utilize Posthog analytics to monitor the usage of this
          application. If you are uncomfortable with this, you are welcome to
          block it using an ad blocker or choose not to use this application
        </p>
        <h3>Contacts</h3>
        <p>
          This app was developed by me, Yevhenii Hyzyla. You can contact me
          using Telegram at <a href="https://t.me/hyzyla">@hyzyla</a> or email
          at <a href="mailto:hyzyla@gmail.com">hyzyla@gmail.com</a>
        </p>
        <hr />
      </div>
    </main>
  );
}
