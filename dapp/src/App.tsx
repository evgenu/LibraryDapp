import * as React from 'react';
import styled from 'styled-components';

import Web3Modal from 'web3modal';
// @ts-ignore
import WalletConnectProvider from '@walletconnect/web3-provider';
import Column from './components/Column';
import Wrapper from './components/Wrapper';
import Header from './components/Header';
import Loader from './components/Loader';
import ConnectButton from './components/ConnectButton';

import { Web3Provider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { parseEther } from '@ethersproject/units'
import { splitSignature } from '@ethersproject/bytes';
import { getChainData } from './helpers/utilities';
import { getContract } from './helpers/ethers';

import { LIBRARY_CONTRACT_ADDRESS } from './constants';
import LIBRARY_CONTRACT from './constants/abis/Library.json';
import LIBTOKEN_CONTRACT from './constants/abis/LibToken.json';


const theme = {
  blue: {
    default: "#3f51b5",
    hover: "#283593"
  },
  pink: {
    default: "#e91e63",
    hover: "#ad1457"
  }
};

const SLayout = styled.div`
  position: relative;
  width: 100%;
  min-height: 100vh;
  text-align: center;
`;

const SContent = styled(Wrapper)`
  width: 100%;
  height: 100%;
  padding: 0 16px;
`;

const SContainer = styled.div`
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  word-break: break-word;
`;

const SLanding = styled(Column)`
  height: 600px;
`;

// @ts-ignore
const SBalances = styled(SLanding)`
  height: 100%;
  & h3 {
    padding-top: 30px;
  }
`;

const Button = styled.button`
  background-color: ${(props) => theme[props.theme].default};
  color: white;
  padding: 5px 15px;
  border-radius: 5px;
  outline: 0;
  text-transform: uppercase;
  margin: 10px 0px;
  cursor: pointer;
  box-shadow: 0px 2px 2px lightgray;
  transition: ease background-color 250ms;
  &:hover {
    background-color: ${(props) => theme[props.theme].hover};
  }
  &:disabled {
    cursor: default;
    opacity: 0.7;
  }
`;

Button.defaultProps = {
  theme: "blue"
};

interface IAppState {
  fetching: boolean;
  address: string;
  library: any;
  connected: boolean;
  chainId: number;
  pendingRequest: boolean;
  result: any | null;
  contract: any | null;
  info: any | null;
  bookQuantity: number;
}

interface IBookRequest {
  id: number;
  count: number;
}

const INITIAL_STATE: IAppState = {
  fetching: false,
  address: '',
  library: null,
  connected: false,
  chainId: 1,
  pendingRequest: false,
  result: null,
  contract: null,
  info: null,
  bookQuantity: 0
};

const INITIAL_BOOK_REQUEST: IBookRequest = {
  id: 0,
  count: 0
}

class App extends React.Component<any, any> {
  // @ts-ignore
  public web3Modal: Web3Modal;
  public state: IAppState;
  public provider: any;
  public bookReq: IBookRequest;
  public clients: string[] = [];
  public wallet: Wallet;
  public walletProvider: any;
  public signer: any;

  constructor(props: any) {
    super(props);
    this.state = {
      ...INITIAL_STATE
    };
    this.bookReq = {
      ...INITIAL_BOOK_REQUEST
    }

    this.web3Modal = new Web3Modal({
      network: this.getNetwork(),
      cacheProvider: true,
      providerOptions: this.getProviderOptions()
    });
  }

  public componentDidMount() {
    if (this.web3Modal.cachedProvider) {
      this.onConnect();
    }
  }

  public onAttemptToApprove = async () => {
    const { contract, address, library } = this.state;
    
    const libTokenAddress = await contract.LibraryToken();
    const libTokenContract = await getContract(libTokenAddress, LIBTOKEN_CONTRACT.abi, library, address);

    const nonce = await libTokenContract.nonces(address); 
    const deadline = + new Date() + 60 * 60; 
    const wrapValue = parseEther('0.1'); 
    
    const EIP712Domain = [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'verifyingContract', type: 'address' }
    ];

    const domain = {
        name: await (contract.LibraryToken()).name(),
        version: '1',
        verifyingContract: (contract.LibraryToken()).address
    };

    const Permit = [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
    ];

    const message = {
        owner: address,
        spender: LIBRARY_CONTRACT_ADDRESS,
        value: wrapValue.toString(),
        nonce: nonce.toHexString(),
        deadline
    };

    const data = JSON.stringify({
        types: {
            EIP712Domain,
            Permit
        },
        domain,
        primaryType: 'Permit',
        message
    })

    const signatureLike = await library.send('eth_signTypedData_v4', [address, data]);
    const signature = await splitSignature(signatureLike)

    const preparedSignature = {
        v: signature.v,
        r: signature.r,
        s: signature.s,
        deadline
    }

    return preparedSignature
  }

  public onConnect = async () => {
    this.provider = await this.web3Modal.connect();

    const library = new Web3Provider(this.provider);

    const network = await library.getNetwork();

    const address = this.provider.selectedAddress ? this.provider.selectedAddress : this.provider.accounts[0];

    this.signer = (new Web3Provider(this.provider)).getSigner();

    console.log(this.signer);


    await this.setState({
      library,
      chainId: network.chainId,
      address,
      connected: true
    });

    await this.subscribeToProviderEvents(this.provider);

    const libraryContract = getContract(LIBRARY_CONTRACT_ADDRESS, LIBRARY_CONTRACT.abi, library, address);


    await this.setState({
      provider: this.provider,
      library,
      chainId: network.chainId,
      address,
      connected: true,
      contract: libraryContract
    });
  };

  public addBooks = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { contract } = this.state;

    await this.setState({ fetching: true });

    const transaction = await contract.addBooks(this.bookReq.id, this.bookReq.count);

    const transactionReceipt = await transaction.wait();
    if (transactionReceipt.status !== 1) {
      alert("Cannot add books to shop")
    }
  }

  public listBooks = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { contract } = this.state;

    const quantity = await contract.listBookQuantity(this.bookReq.id);

    await this.setState({ bookQuantity: Number(quantity) });
  }

  public buyBook = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { contract } = this.state;

    const tx = {
      to: contract.address,
      value: parseEther("0.1")
    };

    const payFee = await this.signer.sendTransaction(tx);
    await payFee.wait();
    console.log(payFee);


    const transaction = await contract.buyBook(this.bookReq.id);


    const transactionReceipt = await transaction.wait();
    if (transactionReceipt.status !== 1) {
      alert("Cannot buy book")
    }
  }

  public returnBook = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { contract } = this.state;

    const transaction = await contract.returnBook(this.bookReq.id);

    const transactionReceipt = await transaction.wait();
    if (transactionReceipt.status !== 1) {
      alert("Cannot return book")
    }
  }

  public rentBook = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { contract } = this.state;

    const signature = await this.onAttemptToApprove();
    console.log(signature);

    const blockNum = await (new Web3Provider(this.provider)).getBlockNumber();

    const transaction = await contract.rentBook(this.bookReq.id, parseEther("0.1"), blockNum + 14, signature.v, signature.r, signature.s);

    const transactionReceipt = await transaction.wait();

    console.log(transactionReceipt);

  }

  public listClients = async () => {
    const { contract } = this.state;

    for (let i = 0; i < contract.numberOfClients(); ++i) {
      this.clients.push(contract.clientAddress(i));
    }
  }

  public subscribeToProviderEvents = async (provider: any) => {
    if (!provider.on) {
      return;
    }

    provider.on("accountsChanged", this.changedAccount);
    provider.on("networkChanged", this.networkChanged);
    provider.on("close", this.close);

    await this.web3Modal.off('accountsChanged');
  };

  public async unSubscribe(provider:any) {
    // Workaround for metamask widget > 9.0.3 (provider.off is undefined);
    window.location.reload(false);
    if (!provider.off) {
      return;
    }

    provider.off("accountsChanged", this.changedAccount);
    provider.off("networkChanged", this.networkChanged);
    provider.off("close", this.close);
  }

  public changedAccount = async (accounts: string[]) => {
    if(!accounts.length) {
      // Metamask Lock fire an empty accounts array 
      await this.resetApp();
    } else {
      await this.setState({ address: accounts[0] });
    }
  }

  public networkChanged = async (networkId: number) => {
    const library = new Web3Provider(this.provider);
    const network = await library.getNetwork();
    const chainId = network.chainId;
    await this.setState({ chainId, library });
  }
  
  public close = async () => {
    this.resetApp();
  }

  public getNetwork = () => getChainData(this.state.chainId).network;

  public getProviderOptions = () => {
    const providerOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: process.env.REACT_APP_INFURA_ID
        }
      }
    };
    return providerOptions;
  };

  public resetApp = async () => {
    await this.web3Modal.clearCachedProvider();
    localStorage.removeItem("WEB3_CONNECT_CACHED_PROVIDER");
    localStorage.removeItem("walletconnect");
    await this.unSubscribe(this.provider);

    this.setState({ ...INITIAL_STATE });

  };

  public render = () => {
    const {
      address,
      connected,
      chainId,
      fetching
    } = this.state;
    return (
      <SLayout>
        <Column maxWidth={1000} spanHeight>
          <Header
            connected={connected}
            address={address}
            chainId={chainId}
            killSession={this.resetApp}
          />
          {this.state.connected && <form onSubmit={this.addBooks}>
            Add book:
            <input type="text" name="bookIdAdd" onChange={event => {this.bookReq.id = Number(event.target.value)}}/>
            <input type="text" name="bookCount" onChange={event => {this.bookReq.count = Number(event.target.value)}}/>
            <input type="submit" value="Submit"/>
          </form>}
          {this.state.connected && <form onSubmit={this.listBooks}>
            Check book quantity by id:
            <input type="text" name="bookIdList" onChange={event => {this.bookReq.id = Number(event.target.value)}}/>
            <input type="submit" value="Submit"/>
          </form>}
          {this.state.connected && <h3>{this.state.bookQuantity}</h3>}
          {this.state.connected && <form onSubmit={this.buyBook}>
            Buy a book:
            <input type="text" name="bookIdBuy" onChange={event => {this.bookReq.id = Number(event.target.value)}}/>
            <input type="submit" value="Submit"/>
          </form>}
          {this.state.connected && <form onSubmit={this.returnBook}>
            Return a book:
            <input type="text" name="bookIdReturn" onChange={event => {this.bookReq.id = Number(event.target.value)}}/>
            <input type="submit" value="Submit"/>
          </form>} 
          {this.state.connected && <form onSubmit={this.rentBook}>
            Rent a book:
            <input type="text" name="bookIdReturn" onChange={event => {this.bookReq.id = Number(event.target.value)}}/>
            <input type="submit" value="Submit"/>
          </form>}
          <Button  onClick={this.listClients}>Update client list</Button>
          {this.state.connected && (this.clients).map(client => <p key={client}>{client}</p>)}

          <SContent>
            {fetching ? (
              <Column center>
                <SContainer>
                  <Loader />
                </SContainer>
              </Column>
            ) : (
                <SLanding center>
                  {!this.state.connected && <ConnectButton onClick={this.onConnect} />}
                </SLanding>
              )}
          </SContent>
        </Column>
      </SLayout>
    );
  };
}

export default App;
