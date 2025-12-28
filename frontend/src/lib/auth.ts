import { NextAuthOptions } from "next-auth";
import OktaProvider from "next-auth/providers/okta";

export const authOptions: NextAuthOptions = {
  providers: [
    OktaProvider({
      clientId: process.env.OKTA_CLIENT_ID!,
      clientSecret: process.env.OKTA_CLIENT_SECRET!,
      issuer: process.env.OKTA_ISSUER,
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }: any) {
      // Store ID token for API calls
      if (account) {
        token.idToken = account.id_token;
        token.accessToken = account.access_token;
        console.log('[JWT] Tokens stored from Okta');
      }
      
      if (profile) {
        token.profile = profile;
      }
      
      return token;
    },
    async session({ session, token }: any) {
      // Pass tokens to client session
      session.idToken = token.idToken;
      session.accessToken = token.accessToken;
      
      session.user = {
        ...session.user,
        id: token.sub,
        name: token.name || token.profile?.name,
        email: token.email || token.profile?.email,
      };
      
      return session;
    },
  },
  pages: {
    signIn: "/",
    signOut: "/",
    error: "/",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
