import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

export default function Home(): JSX.Element {
  return (
    <Layout
      title="DocMan"
      description="Documentation for DocMan maintainers, deployment, and architecture">
      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Resonance Designs</p>
          <Heading as="h1">DocMan Documentation</Heading>
          <p className={styles.lede}>
            Operational notes for release branches, Render, Linode, Cloudflare, and the
            Vue/Vuetify production interface.
          </p>
          <div className={styles.actions}>
            <Link className="button button--primary button--lg" to="/docs/intro">
              Open Docs
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/maintainers/release-workflow">
              Release Workflow
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
