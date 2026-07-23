<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class BmsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'Super Admin']);
        Role::firstOrCreate(['name' => 'Admin']);
        Role::firstOrCreate(['name' => 'Viewer']);

        $this->user = User::create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => bcrypt('password123'),
        ]);
        $this->user->assignRole('Admin');
    }

    public function test_user_can_login()
    {
        $response = $this->postJson('/api/login', [
            'email' => 'john@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Logged in successfully']);
    }

    public function test_user_cannot_login_with_invalid_credentials()
    {
        $response = $this->postJson('/api/login', [
            'email' => 'john@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422)
            ->assertJsonStructure(['errors']);
    }

    public function test_dashboard_endpoint_loads()
    {
        $this->actingAs($this->user);

        $response = $this->getJson('/api/dashboard');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'project_count',
                'projects_by_status',
                'totals',
                'formulas' => ['total_money', 'deduct_money', 'remaining', 'profit'],
                'top_by_remaining',
                'top_by_profit',
                'monthly_trend',
            ]);
    }

    public function test_user_can_login_via_api_token()
    {
        $response = $this->postJson('/api/login', [
            'email' => 'john@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['access_token', 'token_type', 'user']);
    }

    public function test_user_cannot_access_protected_route_without_token()
    {
        $response = $this->getJson('/api/me');
        $response->assertStatus(401);
    }

    public function test_user_can_access_protected_route_with_token()
    {
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'john@example.com',
            'password' => 'password123',
        ]);
        $token = $loginResponse->json('access_token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->getJson('/api/me');

        $response->assertStatus(200)
            ->assertJsonStructure(['user']);
    }

    public function test_admin_can_create_user_via_api()
    {
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'john@example.com',
            'password' => 'password123',
        ]);
        $token = $loginResponse->json('access_token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->postJson('/api/users', [
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => 'jane12345',
            'roles' => ['Viewer'],
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['message', 'user']);
    }

    public function test_non_admin_cannot_create_user_via_api()
    {
        Role::firstOrCreate(['name' => 'Viewer']);
        $this->user->syncRoles(['Viewer']);

        $loginResponse = $this->postJson('/api/login', [
            'email' => 'john@example.com',
            'password' => 'password123',
        ]);
        $token = $loginResponse->json('access_token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->postJson('/api/users', [
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => 'jane12345',
            'roles' => ['Viewer'],
        ]);

        $response->assertStatus(403);
    }

    public function test_user_can_logout_via_api()
    {
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'john@example.com',
            'password' => 'password123',
        ]);
        $token = $loginResponse->json('access_token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->postJson('/api/logout');

        $response->assertStatus(200)
            ->assertJson(['message' => 'Logged out successfully']);
    }
}
