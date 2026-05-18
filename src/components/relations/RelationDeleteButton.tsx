'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

interface RelationDeleteButtonProps {
  relationId: string;
  relationName?: string;
  compact?: boolean;
  redirectTo?: string;
  onDeleted?: (relationId: string) => void;
  className?: string;
}

function relationDeleteError(error: string): string {
  if (error === 'unauthorized') return '로그인이 필요해. 다시 로그인해줘.';
  if (error === 'relation_not_found') return '이미 삭제된 인연이야.';
  if (error === 'invalid_id') return '인연 정보를 다시 불러와줘.';
  return error || '인연 삭제에 실패했어. 잠시 후 다시 시도해줘.';
}

export function RelationDeleteButton({
  relationId,
  relationName,
  compact = false,
  redirectTo,
  onDeleted,
  className = '',
}: RelationDeleteButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function deleteRelation() {
    if (deleting) return;
    const target = relationName?.trim() ? ` '${relationName}'` : '';
    const confirmed = window.confirm(
      `인연${target}을 삭제할까요?\n궁합 리포트와 인연 지도에서도 함께 사라져요.`,
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/relations/${relationId}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          typeof data.error === 'string' ? data.error : 'delete_failed',
        );

      onDeleted?.(relationId);
      if (redirectTo) {
        router.replace(redirectTo);
      } else {
        router.refresh();
      }
    } catch (error) {
      window.alert(
        relationDeleteError(error instanceof Error ? error.message : ''),
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={deleteRelation}
      disabled={deleting}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-red/15 bg-red/5 font-black text-red transition active:scale-[0.98] disabled:opacity-50 ${
        compact ? 'h-9 w-9 p-0' : 'min-h-10 px-3 text-xs'
      } ${className}`}
      aria-label={`${relationName ?? '인연'} 삭제`}
      title={`${relationName ?? '인연'} 삭제`}
    >
      <Trash2 size={compact ? 15 : 14} strokeWidth={2.6} />
      {!compact && <span>{deleting ? '삭제 중' : '삭제'}</span>}
    </button>
  );
}
