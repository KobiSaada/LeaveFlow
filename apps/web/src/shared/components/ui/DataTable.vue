<script setup lang="ts" generic="Row extends { id: string }">
/**
 * Table on wide screens, stacked cards below `md`. Both layouts render the same `cell-<key>` slots,
 * so a view defines each cell once.
 */
export interface Column {
  key: string;
  label: string;
  class?: string;
}

defineProps<{ columns: Column[]; rows: Row[]; caption: string }>();
</script>

<template>
  <div>
    <div
      class="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block"
    >
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <caption class="sr-only">
          {{
            caption
          }}
        </caption>
        <thead class="bg-slate-50">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              class="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase"
              :class="column.class"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="row in rows"
            :key="row.id"
            class="align-top transition-colors hover:bg-slate-50/70"
          >
            <td v-for="column in columns" :key="column.key" class="px-4 py-3" :class="column.class">
              <slot :name="`cell-${column.key}`" :row="row" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ul class="space-y-3 md:hidden" :aria-label="caption">
      <li
        v-for="row in rows"
        :key="row.id"
        class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <dl class="space-y-2 text-sm">
          <div v-for="column in columns" :key="column.key" class="flex justify-between gap-4">
            <dt class="shrink-0 text-slate-500">{{ column.label }}</dt>
            <dd class="text-right"><slot :name="`cell-${column.key}`" :row="row" /></dd>
          </div>
        </dl>
      </li>
    </ul>
  </div>
</template>
