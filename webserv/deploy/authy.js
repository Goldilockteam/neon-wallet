
const args = require('minimist')(process.argv.slice(2))
const {promisify} = require('es6-promisify')
const authy = require('authy')(args.authy)

const authy_register_user = promisify(authy.register_user.bind(authy))

const main = async () => {
  console.log(`registering authy user; email: ${args.userEmail};
    cell: ${args.userCell}; country: ${args.userCellCountry}`)

  const reg_user_res = await authy_register_user(
    args.userEmail, args.userCell, args.userCellCountry)
  // res = {user: {id: 1337}}

  console.log(`the assigned authy user ID is: ${reg_user_res.user.id}`)
}
main()
