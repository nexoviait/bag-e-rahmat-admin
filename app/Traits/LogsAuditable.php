<?php

namespace App\Traits;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

trait LogsAuditable
{
    public static function bootLogsAuditable()
    {
        static::created(function ($model) {
            static::logAudit('create', $model, null, $model->getAttributes());
        });

        static::updated(function ($model) {
            $before = array_intersect_key($model->getOriginal(), $model->getChanges());
            $after = $model->getChanges();

            // Clear noisy timestamps
            unset($before['updated_at'], $after['updated_at']);

            if (count($after) > 0) {
                static::logAudit('update', $model, $before, $after);
            }
        });

        static::deleted(function ($model) {
            static::logAudit('delete', $model, $model->getAttributes(), null);
        });
    }

    protected static function logAudit(string $action, $model, ?array $before, ?array $after)
    {
        if ($model instanceof AuditLog) {
            return;
        }

        AuditLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'model' => class_basename($model),
            'model_id' => $model->id,
            'before_values' => $before,
            'after_values' => $after,
            'ip_address' => Request::ip(),
        ]);
    }
}
