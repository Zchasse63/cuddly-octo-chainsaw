import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { supabaseAdmin } from '../lib/supabase';
import { users, userProfiles } from '../db/schema';
import { eq } from 'drizzle-orm';

export const authRouter = router({
  // Sign up with email/password
  signUp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create auth user in Supabase
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Create user record in our database
      const [user] = await ctx.db
        .insert(users)
        .values({
          id: authData.user.id,
          email: input.email,
        })
        .returning();

      // Create profile
      await ctx.db.insert(userProfiles).values({
        userId: user.id,
        name: input.name,
      });

      return { user, message: 'Account created successfully' };
    }),

  // Sign in with email/password
  signIn: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        user: data.user,
        session: data.session,
      };
    }),

  // Sign out
  signOut: protectedProcedure.mutation(async () => {
    // Client should clear their stored token
    // Server doesn't need to do anything for JWT-based auth
    return { success: true };
  }),

  // Get current user profile
  me: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.user.id),
    });

    return {
      user: ctx.user,
      profile,
    };
  }),

  // Update profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
        goals: z.array(z.string()).optional(),
        trainingFrequency: z.string().optional(),
        preferredEquipment: z.array(z.string()).optional(),
        injuries: z.string().optional(),
        theme: z.enum(['light', 'dark', 'auto']).optional(),
        preferredWeightUnit: z.string().optional(),
        notificationsEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(userProfiles)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, ctx.user.id))
        .returning();

      return updated;
    }),

  // Complete onboarding
  completeOnboarding: protectedProcedure
    .input(
      z.object({
        experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
        goals: z.array(z.string()),
        trainingFrequency: z.string(),
        preferredEquipment: z.array(z.string()),
        injuries: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(userProfiles)
        .set({
          ...input,
          onboardingCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, ctx.user.id))
        .returning();

      return updated;
    }),

  // Refresh session
  refreshSession: publicProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async ({ input }) => {
      const { data, error } = await supabaseAdmin.auth.refreshSession({
        refresh_token: input.refreshToken,
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        session: data.session,
        user: data.user,
      };
    }),
});
