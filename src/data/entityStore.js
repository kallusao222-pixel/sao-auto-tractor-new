import {
  readStorage,
  writeStorage,
} from "./storage";

import {
  generateId,
} from "../utils/id";

import {
  emitDataChange,
} from "./dataEvents";

function readEntityList(key) {
  const value = readStorage(key, []);

  return Array.isArray(value)
    ? value
    : [];
}

export function getEntities(key) {
  return readEntityList(key);
}

export function getEntityById(
  key,
  id,
) {
  const entities =
    readEntityList(key);

  return (
    entities.find(
      (item) =>
        String(item?.id) ===
        String(id),
    ) || null
  );
}

export function saveEntities(
  key,
  entities,
) {
  const safeEntities =
    Array.isArray(entities)
      ? entities
      : [];

  const saved = writeStorage(
    key,
    safeEntities,
  );

  if (saved) {
    emitDataChange({
      type: "entity",
      action: "save",
      key,
    });
  }

  return saved;
}

export function addEntity(
  key,
  entity,
  prefix = "REC",
) {
  const entities =
    readEntityList(key);

  const newEntity = {
    ...entity,
    id:
      entity?.id ||
      generateId(prefix),
    createdAt:
      entity?.createdAt ||
      new Date().toISOString(),
    updatedAt:
      new Date().toISOString(),
  };

  const saved = writeStorage(
    key,
    [...entities, newEntity],
  );

  if (saved) {
    emitDataChange({
      type: "entity",
      action: "add",
      key,
      id: newEntity.id,
    });

    return newEntity;
  }

  return null;
}

export function updateEntity(
  key,
  id,
  updates = {},
) {
  const entities =
    readEntityList(key);

  let updatedEntity = null;

  const nextEntities =
    entities.map((entity) => {
      if (
        String(entity?.id) !==
        String(id)
      ) {
        return entity;
      }

      updatedEntity = {
        ...entity,
        ...updates,
        id: entity.id,
        updatedAt:
          new Date().toISOString(),
      };

      return updatedEntity;
    });

  if (!updatedEntity) {
    return null;
  }

  const saved = writeStorage(
    key,
    nextEntities,
  );

  if (!saved) {
    return null;
  }

  emitDataChange({
    type: "entity",
    action: "update",
    key,
    id,
  });

  return updatedEntity;
}

export function deleteEntity(
  key,
  id,
) {
  const entities =
    readEntityList(key);

  const exists = entities.some(
    (entity) =>
      String(entity?.id) ===
      String(id),
  );

  if (!exists) {
    return false;
  }

  const nextEntities =
    entities.filter(
      (entity) =>
        String(entity?.id) !==
        String(id),
    );

  const saved = writeStorage(
    key,
    nextEntities,
  );

  if (saved) {
    emitDataChange({
      type: "entity",
      action: "delete",
      key,
      id,
    });
  }

  return saved;
}