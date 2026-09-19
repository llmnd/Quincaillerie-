import styles from "./loading.module.css";

export default function WorkspaceLoading() {
  return (
    <div className={styles.workspaceLoading} aria-busy="true" aria-label="Chargement des applications">
      <span className={`${styles.skeletonBlock} ${styles.backSkeleton}`} />
      <div className={styles.topBarSkeleton}>
        <span className={`${styles.skeletonBlock} ${styles.companySkeleton}`} />
        <span className={`${styles.skeletonBlock} ${styles.avatarSkeleton}`} />
      </div>
      <main className={styles.gridWrapSkeleton}>
        <div className={styles.gridSkeleton}>
          <div className={styles.rowWideSkeleton}>
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index} className={`${styles.skeletonBlock} ${styles.moduleSkeleton}`} />
            ))}
          </div>
          <div className={styles.rowNarrowSkeleton}>
            {Array.from({ length: 3 }, (_, index) => (
              <span key={index} className={`${styles.skeletonBlock} ${styles.moduleSkeleton}`} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
