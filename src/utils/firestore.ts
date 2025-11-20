import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

export type InventoryData = {
  name: string;
  quantity: number;
  price: number;
  [key: string]: unknown;
};

export async function saveInventory(inventoryData: InventoryData) {
  try {
    const docRef = await addDoc(collection(db, "inventories"), inventoryData);
    console.log("Documento escrito con ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error al agregar el documento: ", error);
    throw error;
  }
}
