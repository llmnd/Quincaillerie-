import styles from "./loading.module.css";

export default function Loading() {
  return (
    <div className={styles.loadingScreen} aria-busy="true" aria-label="Chargement">
      <aside className={styles.loadingSidebar}>
        <span className={`${styles.skeletonBlock} ${styles.logoSkeleton}`} />
        <div className={styles.sidebarLinks}>
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} className={`${styles.skeletonBlock} ${styles.sidebarLinkSkeleton}`} />
          ))}
        </div>
        <span className={`${styles.skeletonBlock} ${styles.userSkeleton}`} />
      </aside>
      <main className={styles.loadingMain}>
        <header className={styles.loadingTopbar}>
          <span className={`${styles.skeletonBlock} ${styles.backSkeleton}`} />
          <span className={`${styles.skeletonBlock} ${styles.accountSkeleton}`} />
        </header>
        <section className={styles.loadingContent}>
          <span className={`${styles.skeletonBlock} ${styles.eyebrowSkeleton}`} />
          <span className={`${styles.skeletonBlock} ${styles.titleSkeleton}`} />
          <div className={styles.loadingGrid}>
            <span className={`${styles.skeletonBlock} ${styles.panelSkeleton}`} />
            <span className={`${styles.skeletonBlock} ${styles.panelSkeleton}`} />
            <span className={`${styles.skeletonBlock} ${styles.widePanelSkeleton}`} />
          </div>
        </section>
      </main>
    </div>
  );
}