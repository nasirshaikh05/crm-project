import type { FormFieldDef } from "./types";

/** Groups a flat, ordered field list into visual rows. A field starts a new
 *  row unless `newRow === false`, in which case it joins the row of the
 *  field immediately before it — so a row can hold any number of fields. */
export function groupFieldsIntoRows(fields: FormFieldDef[]): FormFieldDef[][] {
  const rows: FormFieldDef[][] = [];
  for (const field of fields) {
    if (field.newRow === false && rows.length > 0) {
      rows[rows.length - 1].push(field);
    } else {
      rows.push([field]);
    }
  }
  return rows;
}
