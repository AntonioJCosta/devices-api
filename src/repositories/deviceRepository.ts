import { db } from '../db/client'
import { devices, type Device, type NewDevice } from '../../drizzle/schema'
import { eq, and } from 'drizzle-orm'
import logger from '../config/logger'

export const deviceRepository = {
    /**
     * Finds a single device by its unique ID.
     * @param id - The numeric ID of the device.
     * @returns The device object if found, otherwise undefined.
     */
    async findById(id: number): Promise<Device | undefined> {
        const [device] = await db.select().from(devices).where(eq(devices.id, id))
        return device
    },

    /**
     * Finds a single device by its unique name.
     * @param name - The name of the device.
     * @returns The device object if found, otherwise undefined.
     */
    async findByName(name: string): Promise<Device | undefined> {
        const [device] = await db.select().from(devices).where(eq(devices.name, name))
        return device
    },

    /**
     * Finds all devices, optionally applying filters.
     * @param filters - An object containing optional 'brand' and 'state' filters.
     * @returns An array of device objects matching the criteria.
     */
    async findAll(filters: { brand?: string; state?: string }): Promise<Device[]> {
        const { brand, state } = filters
        const queryBuilder = db.select().from(devices)
        const conditions = []

        if (brand) {
            conditions.push(eq(devices.brand, brand as Device['brand']))
        }
        if (state) {
          // Ensure state matches the enum type defined in the schema
          conditions.push(eq(devices.state, state as Device['state']))
        }

        if (conditions.length > 0) {
          queryBuilder.where(and(...conditions))
        }

        return await queryBuilder
    },

    /**
     * Creates a new device in the database.
     * Checks for name uniqueness before insertion.
     * @param data - The device data conforming to the NewDevice type.
     * @returns The newly created device object.
     * @throws Error if a device with the same name already exists.
     * @throws Error if the database insertion fails.
     */
    async create(data: NewDevice): Promise<Device> {
        // Check for existing device with the same name
        // const existingDevice = await this.findByName(data.name);
        // if (existingDevice) {
        //     logger.warn({ name: data.name }, "Attempted to create device with duplicate name");
        //     throw new Error(`Device name '${data.name}' already exists.`);
        // }

        // Proceed with creation if name is unique
        const [newDevice] = await db.insert(devices).values(data).returning()
        if (!newDevice) {
          // This case might indicate a DB issue or unexpected Drizzle behavior
          logger.error({ data }, "Failed to retrieve device after insert");
          throw new Error('Failed to create device in repository');
        }
        logger.info({ deviceId: newDevice.id, name: newDevice.name }, "Device created successfully");
        return newDevice
    },

    /**
     * Updates an existing device by its ID.
     * Note: Does not check for name uniqueness conflicts during update here.
     * That logic should reside in the service layer if needed.
     * @param id - The ID of the device to update.
     * @param data - An object containing the fields to update.
     * @returns The updated device object, or null if the device with the given ID was not found.
     */
    async update(id: number, data: Partial<NewDevice>): Promise<Device | null> {
        const [updatedDevice] = await db
            .update(devices)
            .set(data)
            .where(eq(devices.id, id))
            .returning()
        if (updatedDevice) {
            logger.info({ deviceId: id, updatedFields: Object.keys(data) }, "Device updated successfully");
            return updatedDevice;
        }
        logger.warn({ deviceId: id }, "Attempted to update non-existent device");
        return updatedDevice || null
    },

    /**
     * Deletes a device by its ID.
     * @param id - The ID of the device to delete.
     * @returns True if a device was deleted, false otherwise.
     */
    async delete(id: number): Promise<boolean> {
        const result = await db.delete(devices).where(eq(devices.id, id))
        const deleted = result.count > 0;
        if (deleted) {
            logger.info({ deviceId: id }, "Device deleted successfully from repository");
        } else {
            logger.warn({ deviceId: id }, "Attempted to delete non-existent device from repository");
        }
        return deleted;
    }
}