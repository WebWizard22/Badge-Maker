// test/BadgePaymaster.test.js

const { RelayProvider, resolveConfigurationGSN } = require('@opengsn/gsn');
const { GsnTestEnvironment } = require('@opengsn/gsn/dist/GsnTestEnvironment');
const ethers = require('ethers')

const Web3HttpProvider = require( 'web3-providers-http');

const MakerBadges = artifacts.require('MakerBadges');
const BadgeRoles = artifacts.require('BadgeRoles');
const BadgePaymaster = artifacts.require('BadgePaymaster');


const callThroughGsn = async (contract, provider) => {
	const transaction = await contract.pause();
	const receipt = await provider.waitForTransaction(transaction.hash)
	const result = receipt.logs.
		map(entry => contract.interface.parseLog(entry)).
		filter(entry => entry != null)[0];
	return result.values['0']
};  // callThroughGsn

contract('BadgePaymaster', async accounts => {

	const owner = accounts[0];

	ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

	let roles;

	it ('Runs without GSN', async () => {
		roles = await BadgeRoles.new(ZERO_ADDRESS,{from: owner});

		const ownerAddress = await roles.owner();
		assert.equal(ownerAddress, owner);

	});

	it ('Runs with GSN (BadgeRoles)', async () => {

		let env = await GsnTestEnvironment.startGsn('localhost');
		const { relayHubAddress, forwarderAddress } = env.deploymentResult;
		const web3provider = new Web3HttpProvider('http://localhost:8545');
		const deploymentProvider= new ethers.providers.Web3Provider(web3provider)

		const factory = new ethers.ContractFactory(BadgeRoles.abi, BadgeRoles.bytecode, deploymentProvider.getSigner());
		const maker = new ethers.ContractFactory(MakerBadges.abi, MakerBadges.bytecode, deploymentProvider.getSigner());

		const roles = await factory.deploy(forwarderAddress)
		await roles.deployed()

		paymaster = await BadgePaymaster.new();
		await paymaster.setRelayHub(relayHubAddress);
		await paymaster.setTrustedForwarder(forwarderAddress)
		await paymaster.send(1e18);
		await paymaster.setTarget(roles.address);

		const config = await resolveConfigurationGSN(web3provider, {
		       verbose: false,
		       forwarderAddress,
		       paymasterAddress: paymaster.address,
		});

		let gsnProvider = new RelayProvider(web3provider, config);

		const provider = new ethers.providers.Web3Provider(gsnProvider);

		//const acct = provider.provider.newAccount();

		const contract = await new ethers.Contract(roles.address, roles.interface.abi, provider.getSigner(owner.address, owner.privateKey));

		var result = await callThroughGsn(contract, provider);
		assert.equal(result, owner);

	});

	it ('Runs with GSN (MakerBadges)', async () => {

		let env = await GsnTestEnvironment.startGsn('localhost');
		const { relayHubAddress, forwarderAddress } = env.deploymentResult;
		const web3provider = new Web3HttpProvider('http://localhost:8545');
		const deploymentProvider= new ethers.providers.Web3Provider(web3provider)

		const factory = new ethers.ContractFactory(MakerBadges.abi, MakerBadges.bytecode, deploymentProvider.getSigner());

		const badges = await factory.deploy(forwarderAddress, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS);
		await badges.deployed()

		paymaster = await BadgePaymaster.new();
		await paymaster.setRelayHub(relayHubAddress);
		await paymaster.setTrustedForwarder(forwarderAddress)
		await paymaster.send(1e18);
		await paymaster.setTarget(badges.address);

		const config = await resolveConfigurationGSN(web3provider, {
		       verbose: false,
		       forwarderAddress,
		       paymasterAddress: paymaster.address,
		});

		let gsnProvider = new RelayProvider(web3provider, config);

		const provider = new ethers.providers.Web3Provider(gsnProvider);

		//const acct = provider.provider.newAccount();

		const contract = await new ethers.Contract(badges.address, badges.interface.abi, provider.getSigner(owner.address, owner.privateKey));

		var result = await callThroughGsn(contract, provider);
		assert.equal(result, owner);

	});


});