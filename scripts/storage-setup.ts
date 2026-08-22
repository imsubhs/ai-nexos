/**
 * Provisions the Supabase Storage bucket backing document and asset uploads.
 *
 * Idempotent: safe to re-run on every deploy. Reports what it found and what
 * it changed rather than assuming a clean project.
 *
 *   npm run storage:setup -- --environment=staging
 *   npm run storage:setup -- --environment=production
 *
 * The target is named explicitly and never inferred. This script holds a
 * service-role key and administers a bucket; which project's bucket it
 * administers is not something to leave to whichever env file happened to be
 * on disk.
 */
import {
  describeTarget,
  prepareToolingTarget,
  type ToolingTarget,
} from "./lib/environment";

const target: ToolingTarget = prepareToolingTarget("storage:setup");

/**
 * Private, always. Every read goes through a signed URL minted server-side
 * after an authorisation check — a public bucket would make each object
 * readable by anyone who learns its path, which is exactly the failure mode
 * the signed-URL flow exists to prevent. Unchanged by the environment: staging
 * gets exactly the posture production has, or it is not a rehearsal.
 */
const BUCKET_IS_PUBLIC = false;

async function main() {
  // Imported after the environment is loaded so env validation sees the values.
  const { getStorageBucket } = await import("../src/lib/env");
  const { createServiceClient } = await import("../src/lib/supabase/service");

  const bucketName = getStorageBucket();
  const supabase = createServiceClient();

  console.log("\nAI NEX OS — storage setup\n");
  console.log(describeTarget(target));
  console.log(`\n  Bucket: ${bucketName}\n`);

  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(`Could not list buckets: ${listError.message}`);
  }

  const existing = buckets.find((b) => b.name === bucketName);

  if (existing) {
    console.log(`  · exists (public: ${existing.public})`);
    if (existing.public !== BUCKET_IS_PUBLIC) {
      const { error } = await supabase.storage.updateBucket(bucketName, {
        public: BUCKET_IS_PUBLIC,
      });
      if (error) {
        throw new Error(`Could not set bucket private: ${error.message}`);
      }
      console.log(`  ✓ corrected to public: ${BUCKET_IS_PUBLIC}`);
    }
  } else {
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: BUCKET_IS_PUBLIC,
    });
    if (error) {
      throw new Error(`Could not create bucket: ${error.message}`);
    }
    console.log(`  ✓ created (private)`);
  }

  console.log("\n✓ Storage ready.\n");
}

main().catch((error: unknown) => {
  console.error(
    `\n✗ Storage setup failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
