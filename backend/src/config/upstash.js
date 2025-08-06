import {Ratelimit} from "@upstash/ratelimit";
import {Redis} from "@upstash/redis";
import dotenv from "dotenv";

// Choose environment configuration based on NODE_ENV
if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: '.env.dev' });
} else if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: '.env.prod' });
} else {
    dotenv.config(); // Loads .env by default
}

const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(), // Automatically uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from environment variables
    limiter: Ratelimit.slidingWindow(100, "60 s") // 10 requests every 20 seconds
});

export default ratelimit;