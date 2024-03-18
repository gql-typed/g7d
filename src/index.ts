import { ValueNode } from "graphql";

export namespace g7d {
  export interface TypeBase {
    name: string;
    description?: string;
  }

  export interface ScalarType<TInternal, TExternal = TInternal>
    extends TypeBase {
    type: "scalar";
    serialize: (value: TInternal) => string;
    parseValue: (value: TExternal) => TInternal;
    parseLiteral: (ast: ValueNode) => TInternal;
  }

  export interface InterfaceType<T> extends TypeBase {
    type: "interface";
    fields: ExternalFieldsDescription<T>;
  }

  export type ObjectType<TExternal, TInternal> = [
    keyof TExternal & keyof TInternal
  ] extends [never]
    ? TypeBase & {
        type: "object";
        externalFields: ExternalFieldsDescription<TExternal>;
        internalFields: InternalFieldsDescription<TInternal>;
      }
    : never;

  export interface ArrayType<T> extends TypeBase {
    type: "array";
    isOptional?: boolean;
    itemType: Type<T>;
  }

  export interface EnumType<T extends string> extends TypeBase {
    type: "enum";
    items: EnumsDescription<T>;
  }

  export type ExternalFieldsDescription<T> = {
    [K in keyof T]: ExternalFieldDescription<T[K]> &
      (IsOptionalKey<T, K> extends true
        ? Record<"isOptional", true>
        : Partial<Record<"isOptional", false>>);
  };

  export type InternalFieldsDescription<T> = {
    [K in keyof T]: TypeFunction<T[K], IsOptionalKey<T, K>>;
  };

  export interface ExternalFieldDescription<T> {
    type: Type<T>;
    isOptional?: boolean;
    description?: string;
  }

  export type TypeFunction<TType, TIsOptional extends boolean> = (
    type: TType,
    isOptional: TIsOptional
  ) => unknown;

  export type EnumsDescription<T extends string> = Partial<Record<T, string>>;

  export type Type<T> =
    | ScalarType<T, any>
    | InterfaceType<T>
    | ObjectType<unknown, unknown>
    | ArrayType<T>
    | (T extends string ? EnumType<T> : never);

  export type Infer<T extends Type<any>> = T extends ScalarType<any, infer I>
    ? I
    : T extends InterfaceType<infer I>
    ? I
    : T extends ObjectType<infer IExternal, infer IInternal>
    ? IExternal & IInternal
    : T extends ArrayType<infer I>
    ? I
    : T extends EnumType<infer I>
    ? I
    : never;

  export interface FieldResolver<TSelf, TContext> {
    type: Type<TSelf>;
    fields: FieldResolverFields<TSelf, TContext>;
  }

  export type FieldResolverFields<TSelf, TContext> = Record<
    string,
    FieldResolverField<TSelf, TContext, any, any[]>
  >;

  export interface FieldResolverField<
    TSelf,
    TContext,
    TReturnType,
    TParameters extends any[]
  > {
    returnType: Type<TReturnType>;
    description?: string;
    func: (context: TContext, self: TSelf, ...args: TParameters) => TReturnType;
  }
}

type IsOptionalKey<TObject, TKey extends keyof TObject> = Pick<
  TObject,
  Exclude<keyof TObject, TKey>
> extends TObject
  ? true
  : false;

export function scalarType<TInternal, TExternal>({
  name,
  description,
  serialize,
  parseValue,
  parseLiteral,
}: {
  name: string;
  description?: string;
  serialize: (value: TInternal) => string;
  parseValue: (value: TExternal) => TInternal;
  parseLiteral: (ast: ValueNode) => TInternal;
}): g7d.ScalarType<TInternal, TExternal> {
  return {
    type: "scalar",
    name,
    description,
    serialize,
    parseValue,
    parseLiteral,
  };
}

export const Int: g7d.ScalarType<number, number> = { type: "scalar" } as any;
export const Float: g7d.ScalarType<number, number> = { type: "scalar" } as any;
export const String: g7d.ScalarType<string, string> = { type: "scalar" } as any;
export const ID: g7d.ScalarType<string, string> = { type: "scalar" } as any;
export const Boolean: g7d.ScalarType<boolean, boolean> = {
  type: "scalar",
} as any;

export function interfaceType<T>({
  name,
  description,
  fields,
}: {
  name: string;
  description?: string;
  fields: g7d.ExternalFieldsDescription<T>;
}): g7d.InterfaceType<T> {
  return {
    type: "interface",
    name,
    description,
    fields,
  };
}

type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
  x: infer R
) => any
  ? R
  : never;

type InferExternalFieldsDescription<
  T extends g7d.ExternalFieldsDescription<unknown>
> = UnionToIntersection<
  {
    [K in keyof T]: T[K] extends g7d.ExternalFieldDescription<infer I> &
      Record<"isOptional", true>
      ? Partial<Record<K, I>>
      : T[K] extends g7d.ExternalFieldDescription<infer I>
      ? Record<K, I>
      : never;
  }[keyof T]
>;
type InferInternalFieldsDescription<
  T extends g7d.InternalFieldsDescription<unknown>
> = UnionToIntersection<
  {
    [K in keyof T]: T[K] extends g7d.TypeFunction<
      infer IType,
      infer IIsOptional
    >
      ? IIsOptional extends false
        ? Record<K, IType>
        : Partial<Record<K, IType>>
      : never;
  }[keyof T]
>;

export function objectType<
  TExternalFieldsDescription extends g7d.ExternalFieldsDescription<unknown>,
  TInternalFieldDescription extends g7d.InternalFieldsDescription<unknown>
>({
  name,
  description,
  externalFields,
  internalFields,
}: {
  name: string;
  description?: string;
  externalFields: TExternalFieldsDescription;
  internalFields: TInternalFieldDescription;
}): g7d.ObjectType<
  InferExternalFieldsDescription<TExternalFieldsDescription>,
  InferInternalFieldsDescription<TInternalFieldDescription>
> {
  if (
    Object.keys(externalFields)
      .concat(Object.keys(internalFields))
      .findIndex(
        (value, index, arr) => arr.slice(index + 1).indexOf(value) !== -1
      ) !== -1
  ) {
    throw new Error("Duplicate field names");
  }
  return {
    type: "object",
    name,
    description,
    externalFields,
    internalFields,
  } as unknown as g7d.ObjectType<
    InferExternalFieldsDescription<TExternalFieldsDescription>,
    InferInternalFieldsDescription<TInternalFieldDescription>
  >;
}

export function arrayType<T>({
  name,
  description,
  isOptional,
  itemType,
}: {
  name: string;
  description?: string;
  isOptional?: boolean;
  itemType: g7d.Type<T>;
}): g7d.ArrayType<T> {
  return {
    type: "array",
    name,
    description,
    isOptional,
    itemType,
  };
}

export function enumType<T extends Record<string, string>>({
  name,
  description,
  items,
}: {
  name: string;
  description?: string;
  items: T;
}): g7d.EnumType<keyof T & string> {
  return {
    type: "enum",
    name,
    description,
    items,
  };
}

// =============================================================================

const x = objectType({
  name: "X",
  description: "test",
  externalFields: {
    a: {
      type: Int,
    },
    b: {
      type: String,
      isOptional: true,
    },
  },
  internalFields: {
    c: (..._args: [boolean, false]) => 0,
  },
} as const);

type X = g7d.Infer<typeof x>;
