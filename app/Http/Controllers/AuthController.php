<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        // Verify credentials first without committing login session
        if (Auth::once($credentials)) {
            $user = Auth::user();

            // Real login session instantiation
            Auth::login($user, true);

            if ($request->hasSession()) {
                $request->session()->regenerate();
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Logged in successfully',
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => new UserResource($user->load(['roles', 'assignedProjects'])),
                'csrf_token' => csrf_token(),
            ]);
        }

        return response()->json([
            'errors' => [
                'email' => ['The provided credentials do not match our records.'],
            ],
        ], 422);
    }

    public function logout(Request $request)
    {
        $user = Auth::user();
        if ($user && method_exists($user, 'currentAccessToken') && $user->currentAccessToken() && method_exists($user->currentAccessToken(), 'delete')) {
            $user->currentAccessToken()->delete();
        }

        Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Logged out successfully',
            'csrf_token' => csrf_token(),
        ]);
    }

    public function me(Request $request)
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['user' => null], 401);
        }

        $user->load(['roles', 'assignedProjects']);

        return response()->json([
            'user' => new UserResource($user),
        ]);
    }
}
