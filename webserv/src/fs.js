
export const writeFile = (fname, data, cb) => {
  cb(new Error('writeFile is disabled'))
}

export const readFile = (fname, charset, cb) => {

  // TBD if wallet import enabled:
  // 1. fname is path from <input type=file/>
  // 2. read it with FileReader.readAsDataURL()
  // 3. parse JSON and add a `.import` flag
  // 4. return the serialized JSON text, cb(null, json)

  cb(null, null)
}
