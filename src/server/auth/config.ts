import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import DiscordProvider from "next-auth/providers/discord";
import { type Provider } from "next-auth/providers";
import { type JWT } from "next-auth/jwt";

import { env } from "@/env";
import { db } from "@/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
const providers: Provider[] = [];

const devEmailDomain = "@ropejumping.local";

if (env.NODE_ENV === "development") {
  providers.push(
    CredentialsProvider({
      id: "dev-credentials",
      name: "Development",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: `dev${devEmailDomain}`,
        },
      },
      authorize: async (credentials) => {
        const email =
          typeof credentials.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";

        if (!email.endsWith(devEmailDomain)) {
          return null;
        }

        const emailPrefix = email.slice(0, -devEmailDomain.length);
        if (!emailPrefix) {
          return null;
        }

        const name = emailPrefix
          .split(/[._-]+/)
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");

        const user = await db.user.upsert({
          where: { email },
          update: { name },
          create: {
            email,
            name,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  );
}

if (env.AUTH_DISCORD_ID && env.AUTH_DISCORD_SECRET) {
  providers.push(
    DiscordProvider({
      clientId: env.AUTH_DISCORD_ID,
      clientSecret: env.AUTH_DISCORD_SECRET,
    }),
  );
}

export const authConfig = {
  providers,
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }

      return token;
    },
    session: ({ session, token }) => {
      const userId = getTokenUserId(token);

      return {
        ...session,
        user: {
          ...session.user,
          id: userId,
        },
      };
    },
  },
} satisfies NextAuthConfig;

const getTokenUserId = (token: JWT) => {
  if (typeof token.id === "string") {
    return token.id;
  }

  return "";
};
